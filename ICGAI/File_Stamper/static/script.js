
const { PDFDocument, rgb, StandardFonts } = PDFLib;

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;
let canvas = document.getElementById('file-viewer');
let ctx = canvas.getContext('2d');

// Buttons and inputs
const fileInput = document.getElementById('file-input');
const stampSize = document.getElementById('stamp-size');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const downloadBtn = document.getElementById('download-pdf');
const pageInfo = document.getElementById('page-info');
const stampPreview = document.getElementById('stamp-preview');
const stampImagePreview = document.getElementById('stamp-image-preview');

const removeStampsBtn = document.getElementById('remove-stamps');
const removePageStampsBtn = document.getElementById('remove-page-stamps');
const stampImagePath = document.getElementById('stamp-image-path').value;




let stamps = [];
let isImage = false;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';




document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as the default value for the date input
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('stamp-date').value = today;
});

updateButtonVisibility(false);

function updateButtonVisibility(isPdf) {
    if (isPdf) {
        prevPageBtn.style.display = 'inline-block';
        nextPageBtn.style.display = 'inline-block';
    } else {
        prevPageBtn.style.display = 'none';
        nextPageBtn.style.display = 'none';
    }
}

function createStampWithDate(date,username) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Add the date text to the stamp
            ctx.drawImage(img, 0, 0);
            ctx.font = '23px Arial';
            ctx.fillStyle = '#a10606';
            ctx.fillText(date, 75, 187);  // Adjust position as needed
            let processedUsername = processUsername(username);
            
            // Add processed username
            let yOffset = 213;
            processedUsername.forEach(line => {
                ctx.fillText(line, 151, yOffset);
                yOffset += 25;
            
            });
            resolve(canvas.toDataURL());
        };
        const stampImagePath = document.getElementById('stamp-image-path').value;
        img.src = stampImagePath;
    });
}



function processUsername(username) {
    let parts = username.split(' ');
    if (parts.length <= 1) {
        return [username]; 
    } else {
        return [parts[0], parts[parts.length - 1]];
    }
}



fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        if (file.type === 'application/pdf') {
            isImage = false;
            const typedarray = new Uint8Array(e.target.result);
            loadPdfJS(typedarray);
            updateButtonVisibility(true);
        } else {
            isImage = true;
            const img = new Image();
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            }
            img.src = e.target.result;
            pageInfo.textContent = 'Image';
            updateButtonVisibility(false);
        }
    };
    if (file.type === 'application/pdf') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsDataURL(file);
    }
});

function loadPdfJS(typedarray) {
    pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
        pdfDoc = pdf;
        pageInfo.textContent = `Page ${pageNum} of ${pdf.numPages}`;
        renderPage(pageNum);
        updateButtonVisibility(true);
    });
}

function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        page.render(renderContext).promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
            drawStampsOnCanvas();
        });
    });

    pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

prevPageBtn.addEventListener('click', function() {
    if (isImage) return;
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
});

nextPageBtn.addEventListener('click', function() {
    if (isImage) return;
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
});

canvas.addEventListener('mousemove', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = parseInt(stampSize.value);
    const stpsize = size + 50;
    

        stampImagePreview.style.left = `${x}px`;
        stampImagePreview.style.top = `${y}px`;
        stampImagePreview.style.width = `${stpsize}px`;
        stampImagePreview.style.height = `${stpsize}px`;
        stampImagePreview.style.backgroundImage = `url('${stampImagePath}')`;
        stampImagePreview.style.display = 'block';
       
    
});

canvas.addEventListener('mouseleave', function() {
    stampImagePreview.style.display = 'none';
});

canvas.addEventListener('click', async function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = parseInt(stampSize.value);
    const date = document.getElementById('stamp-date').value;
    const username = document.getElementById('user_name').value;


    if (date) {
        const stampImageUrl = await createStampWithDate(date,username);
        const stamp = {
            type: 'image',
            image: stampImageUrl,
            x: x,
            y: y,
            size: size + 50,
            page: isImage ? 1 : pageNum
        };
        stamps.push(stamp);
        drawStamps();
    } else {
        alert('Please enter a date for the stamp.');
    }


});



function drawStamps() {
    if (!isImage) {
        // For PDFs, we need to redraw the current page before adding stamps
        pdfDoc.getPage(pageNum).then(function(page) {
            const viewport = page.getViewport({ scale: scale });
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            
            page.render(renderContext).promise.then(function() {
                drawStampsOnCanvas();
            });
        });
    } else {
        // For images, just clear and redraw
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawStampsOnCanvas();
        }
        img.src = fileInput.files[0] ? URL.createObjectURL(fileInput.files[0]) : '';
    }
}



function drawStampsOnCanvas() {
    stamps.forEach(stamp => {
        if (stamp.page === (isImage ? 1 : pageNum)) {
                const img = new Image();
                img.onload = function() {
                    ctx.drawImage(img, stamp.x, stamp.y, stamp.size, stamp.size);
                };
                img.src = stamp.image;
            
        }
    });
}

downloadBtn.addEventListener('click', async function() {
    try {
        let pdfDoc = await PDFDocument.create();
        let isEncrypted = false;

        if (isImage) {
            const imgData = canvas.toDataURL('image/png');
            const img = await pdfDoc.embedPng(imgData);
            
            const aspectRatio = canvas.width / canvas.height;
            const pageWidth = 612;
            const pageHeight = pageWidth / aspectRatio;
            
            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            page.drawImage(img, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
            });
        } else {
            const existingPdfBytes = await fileInput.files[0].arrayBuffer();
            try {
                const existingPdfDoc = await PDFDocument.load(existingPdfBytes);
                pdfDoc = existingPdfDoc; // Use the existing document instead of creating a new one
            } catch (error) {
                if (error.message.includes('encrypted')) {
                    isEncrypted = true;
                    console.log("PDF is encrypted. Using alternative method.");
                } else {
                    throw error; // Re-throw if it's not an encryption error
                }
            }

            if (isEncrypted) {
                const loadingTask = pdfjsLib.getDocument(existingPdfBytes);
                const pdf = await loadingTask.promise;
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1.5 }); 
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({ canvasContext: context, viewport: viewport }).promise;

                    const imgData = canvas.toDataURL('image/png');
                    const img = await pdfDoc.embedPng(imgData);

                    const newPage = pdfDoc.addPage([viewport.width, viewport.height]);
                    newPage.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: viewport.width,
                        height: viewport.height,
                    });

                    // Apply stamps for this page
                    for (const stamp of stamps) {
                        if (stamp.page === i) {
                            const stampImgBytes = await fetch(stamp.image).then(res => res.arrayBuffer());
                            const stampImg = await pdfDoc.embedPng(stampImgBytes);
                            const scaleFactor = viewport.width / canvas.width;
                            const stampSize = stamp.size * scaleFactor;
                            newPage.drawImage(stampImg, {
                                x: stamp.x * scaleFactor,
                                y: viewport.height - ((stamp.y + stamp.size) * scaleFactor),
                                width: stampSize,
                                height: stampSize,
                            });
                        }
                    }
                }
            }
        }

        if (!isEncrypted) {
            for (let i = 0; i < pdfDoc.getPageCount(); i++) {
                const page = pdfDoc.getPage(i);
                const { width, height } = page.getSize();

                for (const stamp of stamps) {
                    if (stamp.page - 1 === i) {
                        const imgBytes = await fetch(stamp.image).then(res => res.arrayBuffer());
                        const img = await pdfDoc.embedPng(imgBytes);
                        const scaleFactor = width / canvas.width;
                        const stampSize = stamp.size * scaleFactor;
                        page.drawImage(img, {
                            x: stamp.x * scaleFactor,
                            y: height - ((stamp.y + stamp.size) * scaleFactor),
                            width: stampSize,
                            height: stampSize,
                        });
                    }
                }
            }
        }

        const pdfBytes = await pdfDoc.save();
        const originalFileName = fileInput.files[0].name;

        const fileNameParts = originalFileName.split('.');
        fileNameParts.pop();
        const baseFileName = fileNameParts.join('.');
        const downloadFileName = `${baseFileName}_stamped.pdf`;
        downloadPdf(pdfBytes, downloadFileName);
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('An error occurred while generating the PDF. Please try again.');
    }
});

removeStampsBtn.addEventListener('click', function() {
    stamps = [];
    if (isImage) {
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        img.src = fileInput.files[0] ? URL.createObjectURL(fileInput.files[0]) : '';
    } else {
        renderPage(pageNum);
    }
});



removePageStampsBtn.addEventListener('click', function() {
    const currentPage = isImage ? 1 : pageNum;
    
    // Remove all stamps on the current page
    stamps = stamps.filter(stamp => stamp.page !== currentPage);
    
    // Redraw the page without the removed stamps
    if (isImage) {
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            drawStampsOnCanvas();
        }
        img.src = fileInput.files[0] ? URL.createObjectURL(fileInput.files[0]) : '';
    } else {
        renderPage(pageNum);
    }
});

function downloadPdf(pdfBytes, fileName) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
}
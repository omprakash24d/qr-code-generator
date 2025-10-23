/**
 * QR Code Generator - Comprehensive JavaScript Module
 * Features: PWA, dark mode, batch generation, scanning, social sharing, history
 * Author: Om Prakash (omprakash24d)
 * Version: 3.0
 */

class QRGenerator {
  constructor() {
    this.currentMode = "single";
    this.batchQRs = [];
    this.history = JSON.parse(localStorage.getItem("qr-history") || "[]");
    this.scanner = null;
    this.logoFile = null;
    this.currentColors = { foreground: "#000000", background: "#ffffff" };
    this.currentStyle = "squares";
    this.deferredPrompt = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.loadTheme();
    this.checkServiceWorkerSupport();
    this.initializeModeTab();
    this.setupPreview();
    this.displayHistory();
    this.checkPWAInstall();
  }

  bindEvents() {
    // Basic QR generation
    document.getElementById("text").addEventListener("input", () => {
      this.generateQR();
      this.detectContentType();
    });
    document
      .getElementById("size")
      .addEventListener("input", () => this.generateQR());
    document
      .getElementById("error-level")
      .addEventListener("change", () => this.generateQR());
    document
      .getElementById("format")
      .addEventListener("change", () => this.updateDownloadButton());
    document
      .getElementById("download")
      .addEventListener("click", () => this.downloadQR());
    document
      .getElementById("copy-link")
      .addEventListener("click", () => this.copyQRData());

    // Mode tabs
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.switchMode(e.target.dataset.mode)
      );
    });

    // Color pickers
    document
      .getElementById("foreground-color")
      .addEventListener("input", () => this.updateColors());
    document
      .getElementById("background-color")
      .addEventListener("input", () => this.updateColors());
    document
      .getElementById("reset-colors")
      .addEventListener("click", () => this.resetColors());

    // Logo upload
    const logoUpload = document.getElementById("logo-upload");
    if (logoUpload) {
      logoUpload.addEventListener("change", (e) => this.handleLogoUpload(e));
    }

    const logoDropZone = document.getElementById("logo-drag-zone");
    if (logoDropZone) {
      logoDropZone.addEventListener("click", () =>
        document.getElementById("logo-upload").click()
      );
      this.setupDragAndDrop();
    }

    // QR Style options
    document.querySelectorAll('input[name="qr-style"]').forEach((radio) => {
      radio.addEventListener("change", (e) =>
        this.updateQRStyle(e.target.value)
      );
    });

    // Batch generation
    document.querySelectorAll(".method-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.switchInputMethod(e.target.dataset.method)
      );
    });

    const csvUpload = document.getElementById("csv-upload");
    if (csvUpload) {
      csvUpload.addEventListener("change", (e) => this.handleCSVUpload(e));
    }

    const generateBatch = document.getElementById("generate-batch");
    if (generateBatch) {
      generateBatch.addEventListener("click", () => this.generateBatchQRs());
    }

    const downloadBatch = document.getElementById("download-batch");
    if (downloadBatch) {
      downloadBatch.addEventListener("click", () => this.downloadBatchZip());
    }

    // Scanner
    const startScan = document.getElementById("start-scan");
    const stopScan = document.getElementById("stop-scan");
    const copyResult = document.getElementById("copy-result");

    if (startScan)
      startScan.addEventListener("click", () => this.startScanning());
    if (stopScan) stopScan.addEventListener("click", () => this.stopScanning());
    if (copyResult)
      copyResult.addEventListener("click", () => this.copyScannedResult());

    // Social sharing
    const shareWhatsapp = document.getElementById("share-whatsapp");
    const shareTwitter = document.getElementById("share-twitter");
    const shareEmail = document.getElementById("share-email");
    const shareCopy = document.getElementById("share-copy");

    if (shareWhatsapp)
      shareWhatsapp.addEventListener("click", () => this.shareToWhatsApp());
    if (shareTwitter)
      shareTwitter.addEventListener("click", () => this.shareToTwitter());
    if (shareEmail)
      shareEmail.addEventListener("click", () => this.shareToEmail());
    if (shareCopy)
      shareCopy.addEventListener("click", () => this.copyQRImage());

    // PWA
    const installPWA = document.getElementById("install-pwa");
    const dismissBanner = document.getElementById("dismiss-banner");

    if (installPWA)
      installPWA.addEventListener("click", () => this.installPWA());
    if (dismissBanner)
      dismissBanner.addEventListener("click", () =>
        this.dismissInstallBanner()
      );

    // History
    const clearHistory = document.getElementById("clear-history");
    const exportHistory = document.getElementById("export-history");

    if (clearHistory)
      clearHistory.addEventListener("click", () => this.clearHistory());
    if (exportHistory)
      exportHistory.addEventListener("click", () => this.exportHistory());

    // Theme toggle
    document
      .getElementById("theme-toggle")
      .addEventListener("click", () => this.toggleTheme());

    // FAQ toggles
    document.querySelectorAll(".faq-question").forEach((question) => {
      question.addEventListener("click", () => this.toggleFAQ(question));
    });

    // Input validation
    document
      .getElementById("text")
      .addEventListener("input", () => this.validateInput());

    // Search console
    const generateConsoleQR = document.getElementById("generate-console-qr");
    if (generateConsoleQR) {
      generateConsoleQR.addEventListener("click", () =>
        this.generateSearchConsoleQR()
      );
    }
  }

  initializeModeTab() {
    this.switchMode("single");
  }

  switchMode(mode) {
    this.currentMode = mode;

    // Update tab buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    // Update tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.toggle("active", content.id === `${mode}-tab`);
    });

    if (mode === "scan") {
      this.initializeScanner();
    } else if (mode === "single") {
      this.generateQR();
    }
  }

  setupPreview() {
    const canvas = document.getElementById("preview-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = 200;
    canvas.height = 200;

    // Draw placeholder
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, 200, 200);
    ctx.strokeStyle = "#ccc";
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(10, 10, 180, 180);

    ctx.fillStyle = "#999";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Live Preview", 100, 105);
  }

  detectContentType() {
    const text = document.getElementById("text").value.trim();
    const indicator = document.querySelector(".content-type-indicator");

    if (!indicator || !text) {
      if (indicator) indicator.textContent = "";
      return;
    }

    if (text.match(/^https?:\/\//)) {
      indicator.textContent = "🔗 URL";
    } else if (text.match(/^mailto:/)) {
      indicator.textContent = "📧 Email";
    } else if (text.match(/^tel:/)) {
      indicator.textContent = "📞 Phone";
    } else if (text.match(/^wifi:/i)) {
      indicator.textContent = "📶 WiFi";
    } else if (text.includes("@") && text.includes(".")) {
      indicator.textContent = "📧 Email";
    } else {
      indicator.textContent = "📝 Text";
    }
  }

  updateColors() {
    this.currentColors.foreground =
      document.getElementById("foreground-color").value;
    this.currentColors.background =
      document.getElementById("background-color").value;

    this.checkContrast();
    this.generateQR();
  }

  resetColors() {
    this.currentColors = { foreground: "#000000", background: "#ffffff" };
    document.getElementById("foreground-color").value = "#000000";
    document.getElementById("background-color").value = "#ffffff";
    this.generateQR();
  }

  checkContrast() {
    const contrast = this.calculateContrast(
      this.currentColors.foreground,
      this.currentColors.background
    );
    const indicator = document.querySelector(".contrast-indicator");

    if (!indicator) return;

    if (contrast >= 4.5) {
      indicator.className = "contrast-indicator good";
      indicator.textContent = `✅ Good contrast (${contrast.toFixed(1)}:1)`;
    } else {
      indicator.className = "contrast-indicator poor";
      indicator.textContent = `⚠️ Poor contrast (${contrast.toFixed(1)}:1)`;
    }
  }

  calculateContrast(color1, color2) {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  getLuminance(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;

    const r =
      rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g =
      gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b =
      bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  setupDragAndDrop() {
    const dropZone = document.getElementById("logo-drag-zone");
    if (!dropZone) return;

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () =>
        dropZone.classList.add("drag-over")
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () =>
        dropZone.classList.remove("drag-over")
      );
    });

    dropZone.addEventListener("drop", (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleLogoFile(files[0]);
      }
    });
  }

  handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      this.handleLogoFile(file);
    }
  }

  handleLogoFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.querySelector(".file-preview");
      if (preview) {
        const image = preview.querySelector(".preview-image");
        const info = preview.querySelector(".preview-info");

        if (image) image.src = e.target.result;
        if (info)
          info.textContent = `${file.name} (${(file.size / 1024).toFixed(
            1
          )} KB)`;
        preview.classList.add("active");
      }

      this.generateQR();
    };
    reader.readAsDataURL(file);
  }

  updateQRStyle(style) {
    this.currentStyle = style;
    this.generateQR();
  }

  async generateQR() {
    const text = document.getElementById("text").value.trim();

    if (!text) {
      const qrSection = document.getElementById("qr-section");
      if (qrSection) qrSection.style.display = "none";
      this.clearPreview();
      return;
    }

    const size = parseInt(document.getElementById("size").value) || 256;
    const errorLevel = document.getElementById("error-level").value || "M";
    const textBelow = document.getElementById("text-below")
      ? document.getElementById("text-below").value
      : "";

    // Clear existing QR
    const qrContainer = document.getElementById("qrcode");
    if (qrContainer) qrContainer.innerHTML = "";

    // Check if QRCodeStyling is available
    if (typeof QRCodeStyling !== "undefined") {
      // Use QR-Code-Styling for advanced styling
      const qrCode = new QRCodeStyling({
        width: size,
        height: size,
        data: text,
        qrOptions: {
          errorCorrectionLevel: errorLevel,
        },
        dotsOptions: {
          color: this.currentColors.foreground,
          type: this.currentStyle,
        },
        backgroundOptions: {
          color: this.currentColors.background,
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 10,
        },
      });

      // Add logo if available
      if (this.logoFile) {
        const logoUrl = URL.createObjectURL(this.logoFile);
        qrCode.update({
          image: logoUrl,
        });
      }

      if (qrContainer) {
        qrCode.append(qrContainer);
        this.updatePreview(qrCode);
      }
    } else {
      // Fallback to basic QRCode.js
      if (qrContainer && typeof QRCode !== "undefined") {
        new QRCode(qrContainer, {
          text: text,
          width: size,
          height: size,
          colorDark: this.currentColors.foreground,
          colorLight: this.currentColors.background,
          correctLevel:
            QRCode.CorrectLevel[errorLevel] || QRCode.CorrectLevel.M,
        });
      }
    }

    // Add text below if specified
    if (textBelow && qrContainer) {
      const textDiv = document.createElement("div");
      textDiv.style.cssText =
        "text-align: center; margin-top: 10px; font-size: 14px; color: var(--text-primary);";
      textDiv.textContent = textBelow;
      qrContainer.appendChild(textDiv);
    }

    const qrSection = document.getElementById("qr-section");
    if (qrSection) qrSection.style.display = "block";

    this.updateDownloadButton();
    this.validateInput();

    // Save to history
    this.saveToHistory(text, size, this.currentColors, this.currentStyle);
  }

  updatePreview(qrCode) {
    const canvas = document.getElementById("preview-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get QR canvas and draw scaled version
    setTimeout(() => {
      const qrCanvas = document.querySelector("#qrcode canvas");
      if (qrCanvas) {
        ctx.drawImage(qrCanvas, 0, 0, 200, 200);
      }
    }, 100);
  }

  clearPreview() {
    const canvas = document.getElementById("preview-canvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.setupPreview();
    }
  }

  switchInputMethod(method) {
    document.querySelectorAll(".method-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.method === method);
    });

    document.querySelectorAll(".method-content").forEach((content) => {
      content.classList.toggle("active", content.dataset.method === method);
    });
  }

  handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target.result;
        this.parseCSVData(csv);
      };
      reader.readAsText(file);
    }
  }

  parseCSVData(csv) {
    const lines = csv.split("\n").filter((line) => line.trim());
    const textarea = document.getElementById("batch-text-input");
    if (textarea) {
      const data = lines.map((line) => {
        const [text, filename] = line.split(",").map((item) => item.trim());
        return filename ? `${text}|${filename}` : text;
      });
      textarea.value = data.join("\n");
    }
  }

  async generateBatchQRs() {
    const textInput = document.getElementById("batch-text-input");
    if (!textInput || !textInput.value.trim()) {
      alert("Please enter text data for batch generation");
      return;
    }

    const lines = textInput.value.split("\n").filter((line) => line.trim());
    const batchSize = document.getElementById("batch-size");
    const batchFormat = document.getElementById("batch-format");
    const size = batchSize ? parseInt(batchSize.value) : 256;
    const format = batchFormat ? batchFormat.value : "png";

    this.batchQRs = [];
    const progressBar = document.querySelector(".progress-fill");
    const progressText = document.querySelector(".progress-text");
    const batchProgress = document.querySelector(".batch-progress");

    if (batchProgress) batchProgress.style.display = "block";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const [text, filename] = line.includes("|")
        ? line.split("|")
        : [line, `qr_${i + 1}`];

      // Update progress
      const progress = ((i + 1) / lines.length) * 100;
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (progressText)
        progressText.textContent = `Generating ${i + 1} of ${lines.length}...`;

      // Generate QR using available library
      if (typeof QRCodeStyling !== "undefined") {
        const qrCode = new QRCodeStyling({
          width: size,
          height: size,
          data: text,
          qrOptions: { errorCorrectionLevel: "M" },
          dotsOptions: {
            color: this.currentColors.foreground,
            type: this.currentStyle,
          },
          backgroundOptions: { color: this.currentColors.background },
        });

        try {
          const blob = await qrCode.getRawData(
            format === "png" ? "png" : "jpeg"
          );
          this.batchQRs.push({
            filename: `${filename}.${format}`,
            blob: blob,
            text: text,
          });
        } catch (error) {
          console.error("Failed to generate QR for:", text, error);
        }
      } else {
        // Fallback: generate using canvas
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        try {
          if (typeof QRCode !== "undefined") {
            await new Promise((resolve, reject) => {
              QRCode.toCanvas(
                canvas,
                text,
                {
                  width: size,
                  height: size,
                  color: {
                    dark: this.currentColors.foreground,
                    light: this.currentColors.background,
                  },
                },
                (error) => {
                  if (error) reject(error);
                  else resolve();
                }
              );
            });

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  this.batchQRs.push({
                    filename: `${filename}.${format}`,
                    blob: blob,
                    text: text,
                  });
                }
              },
              `image/${format}`,
              0.9
            );
          }
        } catch (error) {
          console.error("Failed to generate QR for:", text, error);
        }
      }

      // Small delay to prevent UI blocking
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    if (progressText)
      progressText.textContent = `Generated ${lines.length} QR codes successfully!`;

    const downloadBatch = document.getElementById("download-batch");
    if (downloadBatch) downloadBatch.disabled = false;
  }

  async downloadBatchZip() {
    if (this.batchQRs.length === 0) {
      alert("No QR codes to download");
      return;
    }

    if (typeof JSZip === "undefined") {
      alert("Batch download not available - JSZip library not loaded");
      return;
    }

    const zip = new JSZip();

    this.batchQRs.forEach((qr) => {
      zip.file(qr.filename, qr.blob);
    });

    // Add manifest file
    const manifest = this.batchQRs.map((qr) => ({
      filename: qr.filename,
      text: qr.text,
      generated: new Date().toISOString(),
    }));
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipBlob);
      link.download = `qr_batch_${new Date().getTime()}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Failed to create ZIP file:", error);
      alert("Failed to create download file");
    }
  }

  async initializeScanner() {
    if (!this.scanner && typeof QrScanner !== "undefined") {
      try {
        const video = document.getElementById("camera-feed");
        if (video) {
          this.scanner = new QrScanner(
            video,
            (result) => this.handleScanResult(result),
            {
              highlightScanRegion: true,
              highlightCodeOutline: true,
            }
          );
        }
      } catch (error) {
        console.error("Scanner initialization failed:", error);
        const scannerContainer = document.querySelector(".scanner-container");
        if (scannerContainer) {
          scannerContainer.innerHTML =
            "<p>Camera scanning not supported on this device/browser</p>";
        }
      }
    }
  }

  async startScanning() {
    if (this.scanner) {
      try {
        await this.scanner.start();
        const startBtn = document.getElementById("start-scan");
        const stopBtn = document.getElementById("stop-scan");
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
      } catch (error) {
        alert("Camera access denied or not available");
        console.error("Scanner start failed:", error);
      }
    }
  }

  stopScanning() {
    if (this.scanner) {
      this.scanner.stop();
      const startBtn = document.getElementById("start-scan");
      const stopBtn = document.getElementById("stop-scan");
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
    }
  }

  handleScanResult(result) {
    const resultText = document.getElementById("scan-result-text");
    const scanResult = document.querySelector(".scan-result");

    if (resultText) resultText.textContent = result.data;
    if (scanResult) scanResult.style.display = "block";

    // Auto-detect and format result
    const data = result.data;
    if (data.startsWith("http") && resultText) {
      resultText.innerHTML = `<a href="${data}" target="_blank" rel="noopener">${data}</a>`;
    }
  }

  copyScannedResult() {
    const resultText = document.getElementById("scan-result-text");
    const result = resultText ? resultText.textContent : "";
    if (result) {
      navigator.clipboard.writeText(result).then(() => {
        const btn = document.getElementById("copy-result");
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = "Copied!";
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        }
      });
    }
  }

  shareToWhatsApp() {
    const text = document.getElementById("text").value.trim();
    if (text) {
      const message = encodeURIComponent(`Check out this QR code: ${text}`);
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  }

  shareToTwitter() {
    const text = encodeURIComponent("Check out this QR Code I generated!");
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank"
    );
  }

  shareToEmail() {
    const text = document.getElementById("text").value.trim();
    const subject = encodeURIComponent("QR Code");
    const body = encodeURIComponent(
      `Check out this QR code content: ${text}\n\nGenerated at: ${window.location.href}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  async copyQRImage() {
    const canvas = document.querySelector("#qrcode canvas");
    if (canvas) {
      try {
        canvas.toBlob((blob) => {
          if (navigator.clipboard && navigator.clipboard.write) {
            navigator.clipboard
              .write([new ClipboardItem({ "image/png": blob })])
              .then(() => {
                const btn = document.getElementById("share-copy");
                if (btn) {
                  const originalText = btn.textContent;
                  btn.textContent = "Copied!";
                  setTimeout(() => {
                    btn.textContent = originalText;
                  }, 2000);
                }
              });
          } else {
            // Fallback to copying text
            this.copyQRData();
          }
        });
      } catch (error) {
        // Fallback to copying text
        this.copyQRData();
      }
    }
  }

  saveToHistory(text, size, colors, style) {
    const historyItem = {
      id: Date.now(),
      text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
      fullText: text,
      size,
      colors: { ...colors },
      style,
      date: new Date().toISOString(),
    };

    this.history.unshift(historyItem);
    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }

    localStorage.setItem("qr-history", JSON.stringify(this.history));
    this.displayHistory();
  }

  displayHistory() {
    const historySection = document.getElementById("history-section");
    if (!historySection) return;

    if (this.history.length === 0) {
      historySection.style.display = "none";
      return;
    }

    historySection.style.display = "block";
    const grid = document.querySelector(".history-grid");
    if (!grid) return;

    grid.innerHTML = this.history
      .map(
        (item) => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-qr" data-text="${item.fullText}" data-size="${
          item.size
        }"></div>
        <div class="history-info">${item.text}</div>
        <div class="history-date">${new Date(
          item.date
        ).toLocaleDateString()}</div>
        <div class="history-actions">
          <button class="history-btn" onclick="qrGenerator.applyFromHistory(${
            item.id
          })">Apply</button>
          <button class="history-btn" onclick="qrGenerator.downloadFromHistory(${
            item.id
          })">Download</button>
          <button class="history-btn" onclick="qrGenerator.removeFromHistory(${
            item.id
          })">Remove</button>
        </div>
      </div>
    `
      )
      .join("");

    // Generate mini QR codes
    this.history.forEach((item) => {
      const container = document.querySelector(
        `[data-id="${item.id}"] .history-qr`
      );
      if (container && typeof QRCodeStyling !== "undefined") {
        try {
          const miniQR = new QRCodeStyling({
            width: 80,
            height: 80,
            data: item.fullText,
            dotsOptions: { color: item.colors.foreground, type: item.style },
            backgroundOptions: { color: item.colors.background },
          });
          miniQR.append(container);
        } catch (error) {
          console.error("Failed to generate mini QR:", error);
        }
      }
    });
  }

  applyFromHistory(id) {
    const item = this.history.find((h) => h.id === id);
    if (item) {
      document.getElementById("text").value = item.fullText;
      document.getElementById("size").value = item.size;
      document.getElementById("foreground-color").value =
        item.colors.foreground;
      document.getElementById("background-color").value =
        item.colors.background;

      const styleRadio = document.querySelector(
        `input[name="qr-style"][value="${item.style}"]`
      );
      if (styleRadio) styleRadio.checked = true;

      this.currentColors = { ...item.colors };
      this.currentStyle = item.style;
      this.generateQR();

      // Switch to single mode
      this.switchMode("single");
    }
  }

  downloadFromHistory(id) {
    const item = this.history.find((h) => h.id === id);
    if (item) {
      this.applyFromHistory(id);
      setTimeout(() => this.downloadQR(), 500);
    }
  }

  removeFromHistory(id) {
    this.history = this.history.filter((h) => h.id !== id);
    localStorage.setItem("qr-history", JSON.stringify(this.history));
    this.displayHistory();
  }

  clearHistory() {
    if (confirm("Are you sure you want to clear all history?")) {
      this.history = [];
      localStorage.removeItem("qr-history");
      this.displayHistory();
    }
  }

  exportHistory() {
    const data = JSON.stringify(this.history, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qr_history_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  generateSearchConsoleQR() {
    const code = document.getElementById("search-console-code");
    if (code && code.value.trim()) {
      document.getElementById("text").value = code.value.trim();
      this.switchMode("single");
      this.generateQR();
    }
  }

  checkPWAInstall() {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      const banner = document.querySelector(".pwa-install-banner");
      if (banner) banner.style.display = "none";
    }
  }

  dismissInstallBanner() {
    const banner = document.querySelector(".pwa-install-banner");
    if (banner) banner.style.display = "none";
    localStorage.setItem("pwa-banner-dismissed", "true");
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted PWA install");
        }
        this.deferredPrompt = null;
      });
    }
  }

  updateCharacterCount() {
    const text = document.getElementById("text").value;
    const count = text.length;
    const counter = document.getElementById("char-count");

    if (counter) {
      counter.textContent = `${count} characters`;

      if (count > 2000) {
        counter.style.color = "var(--error)";
      } else if (count > 1500) {
        counter.style.color = "var(--warning)";
      } else {
        counter.style.color = "var(--text-secondary)";
      }
    }
  }

  validateInput() {
    const text = document.getElementById("text").value;
    const validation = document.getElementById("input-validation");

    if (validation) {
      if (text.length > 2000) {
        validation.textContent =
          "⚠️ Text is very long and may not scan reliably";
        validation.style.color = "var(--error)";
      } else if (text.length > 1500) {
        validation.textContent =
          "⚠️ Text is long, consider shortening for better scanning";
        validation.style.color = "var(--warning)";
      } else if (text.length === 0) {
        validation.textContent = "";
      } else {
        validation.textContent = "✅ Good length for QR code";
        validation.style.color = "var(--success)";
      }
    }

    this.updateCharacterCount();
  }

  downloadQR() {
    const format = document.getElementById("format").value;
    const text = document.getElementById("text").value.trim();

    if (!text) {
      alert("Please enter text to generate QR code");
      return;
    }

    const qrCanvas = document.querySelector("#qrcode canvas");
    if (!qrCanvas) {
      alert("Please generate QR code first");
      return;
    }

    const link = document.createElement("a");

    if (format === "svg") {
      const svg = document.querySelector("#qrcode svg");
      if (svg) {
        const serializer = new XMLSerializer();
        const svgBlob = new Blob([serializer.serializeToString(svg)], {
          type: "image/svg+xml",
        });
        link.href = URL.createObjectURL(svgBlob);
        link.download = "qrcode.svg";
      }
    } else {
      link.href = qrCanvas.toDataURL(`image/${format}`, 0.9);
      link.download = `qrcode.${format}`;
    }

    link.click();
    URL.revokeObjectURL(link.href);
  }

  updateDownloadButton() {
    const text = document.getElementById("text").value.trim();
    const downloadBtn = document.getElementById("download");
    if (downloadBtn) {
      downloadBtn.disabled = !text;
    }
  }

  copyQRData() {
    const text = document.getElementById("text").value.trim();
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById("copy-link");
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = "Copied!";
          btn.style.background = "var(--success)";

          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = "";
          }, 2000);
        }
      });
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("qr-theme", newTheme);

    const icon = document.querySelector("#theme-toggle i");
    if (icon) {
      icon.className = newTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }

  loadTheme() {
    const savedTheme =
      localStorage.getItem("qr-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    document.documentElement.setAttribute("data-theme", savedTheme);

    const icon = document.querySelector("#theme-toggle i");
    if (icon) {
      icon.className = savedTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }

  toggleFAQ(element) {
    const answer = element.nextElementSibling;
    const icon = element.querySelector("i");

    if (answer) {
      answer.style.display =
        answer.style.display === "block" ? "none" : "block";
    }

    if (icon) {
      icon.style.transform =
        answer && answer.style.display === "block"
          ? "rotate(180deg)"
          : "rotate(0deg)";
    }
  }

  checkServiceWorkerSupport() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then((registration) => console.log("SW registered"))
        .catch((error) => console.log("SW registration failed"));
    }
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  window.qrGenerator = new QRGenerator();

  // PWA install prompt
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.qrGenerator.deferredPrompt = e;

    // Show install banner if not dismissed
    if (!localStorage.getItem("pwa-banner-dismissed")) {
      const banner = document.querySelector(".pwa-install-banner");
      if (banner) banner.style.display = "block";
    }
  });

  // Handle app installed event
  window.addEventListener("appinstalled", () => {
    const banner = document.querySelector(".pwa-install-banner");
    if (banner) banner.style.display = "none";
    console.log("PWA was installed");
  });
});

/**
 * QR Code Generator - Enhanced JavaScript Module
 * Features: PWA support, dark mode, logo overlay, UTM tracking, accessibility
 * Author: Om
 * Version: 2.0
 */

class QRGenerator {
  constructor() {
    this.init();
    this.setupEventListeners();
    this.registerServiceWorker();
    this.initializeTheme();
  }

  // Initialize DOM elements
  init() {
    this.elements = {
      form: document.getElementById("qr-form"),
      qrText: document.getElementById("qr-text"),
      logoInput: document.getElementById("logo-upload"),
      qrSize: document.getElementById("qr-size"),
      qrOutput: document.getElementById("qr-output"),
      qrResult: document.getElementById("qr-result"),
      downloadSection: document.getElementById("download-section"),
      downloadPng: document.getElementById("download-png"),
      downloadSvg: document.getElementById("download-svg"),
      generateBtn: document.getElementById("generate-btn"),
      themeToggle: document.getElementById("theme-toggle"),
      toast: document.getElementById("toast"),
    };

    this.currentQRData = null;
    this.currentSVGData = null;
    this.initializeFAQ();
  }

  // Setup all event listeners
  setupEventListeners() {
    // Form submission
    this.elements.form.addEventListener("submit", (e) =>
      this.handleFormSubmit(e)
    );

    // Theme toggle
    this.elements.themeToggle.addEventListener("click", () =>
      this.toggleTheme()
    );

    // File upload
    this.elements.logoInput.addEventListener("change", (e) =>
      this.handleLogoUpload(e)
    );

    // Download buttons
    this.elements.downloadPng.addEventListener("click", () =>
      this.downloadPNG()
    );
    this.elements.downloadSvg.addEventListener("click", () =>
      this.downloadSVG()
    );

    // Keyboard navigation
    document.addEventListener("keydown", (e) => this.handleKeyboard(e));

    // Form validation
    this.elements.qrText.addEventListener("input", () => this.validateForm());

    // Auto-save form data
    this.elements.form.addEventListener("input", () => this.saveFormData());

    // Load saved form data
    this.loadFormData();
  }

  // Handle form submission
  async handleFormSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) {
      this.showToast("Please enter valid text or URL", "error");
      return;
    }

    this.setLoading(true);

    try {
      const qrData = this.buildQRData();
      const size = parseInt(this.elements.qrSize.value);

      await this.generateQRCode(qrData, size);
      this.showDownloadSection();
      this.showToast("QR code generated successfully!", "success");

      // Analytics tracking
      this.trackEvent("qr_generated", {
        size,
        hasLogo: !!this.elements.logoInput.files[0],
      });
    } catch (error) {
      console.error("QR generation error:", error);
      this.showToast("Failed to generate QR code. Please try again.", "error");
    } finally {
      this.setLoading(false);
    }
  }

  // Build QR data
  buildQRData() {
    return this.elements.qrText.value.trim();
  }

  // Generate QR code with logo overlay
  async generateQRCode(text, size) {
    // Clear previous output
    this.elements.qrOutput.innerHTML = "";

    // Create canvas
    const canvas = document.createElement("canvas");

    // QR code options
    const options = {
      width: size,
      height: size,
      margin: 2,
      color: {
        dark: getComputedStyle(document.documentElement)
          .getPropertyValue("--text-primary")
          .trim(),
        light: getComputedStyle(document.documentElement)
          .getPropertyValue("--bg-primary")
          .trim(),
      },
      errorCorrectionLevel: "M",
    };

    // Generate QR code
    await QRCode.toCanvas(canvas, text, options);

    // Add logo overlay if file selected
    if (this.elements.logoInput.files[0]) {
      await this.addLogoOverlay(canvas);
    }

    // Store canvas data
    this.currentQRData = canvas;

    // Generate SVG version
    await this.generateSVGVersion(text, options);

    // Add to DOM with animation
    this.elements.qrOutput.appendChild(canvas);

    // Add accessibility attributes
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `QR code for: ${text}`);
  }

  // Add logo overlay to canvas
  async addLogoOverlay(canvas) {
    const ctx = canvas.getContext("2d");
    const logoFile = this.elements.logoInput.files[0];

    return new Promise((resolve, reject) => {
      const logo = new Image();

      logo.onload = () => {
        try {
          // Calculate logo size (15% of QR code)
          const logoSize = Math.min(canvas.width, canvas.height) * 0.15;
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;

          // Draw white background circle
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(
            canvas.width / 2,
            canvas.height / 2,
            logoSize / 2 + 5,
            0,
            2 * Math.PI
          );
          ctx.fill();

          // Draw logo
          ctx.drawImage(logo, x, y, logoSize, logoSize);

          resolve();
        } catch (error) {
          reject(error);
        }
      };

      logo.onerror = () => reject(new Error("Failed to load logo"));
      logo.src = URL.createObjectURL(logoFile);
    });
  }

  // Generate SVG version
  async generateSVGVersion(text, options) {
    return new Promise((resolve) => {
      QRCode.toString(
        text,
        {
          type: "svg",
          width: options.width,
          height: options.height,
          margin: options.margin,
          color: options.color,
          errorCorrectionLevel: options.errorCorrectionLevel,
        },
        (err, svg) => {
          if (!err) {
            this.currentSVGData = svg;
          }
          resolve();
        }
      );
    });
  }

  // Show download section with animation
  showDownloadSection() {
    this.elements.qrResult.style.display = "block";
    this.elements.downloadSection.classList.add("visible");

    // Smooth scroll to result
    this.elements.qrOutput.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  // Download PNG
  downloadPNG() {
    if (!this.currentQRData) return;

    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

    link.download = `qr-code-${timestamp}.png`;
    link.href = this.currentQRData.toDataURL("image/png", 1.0);

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast("PNG downloaded successfully!", "success");
    this.trackEvent("download", { format: "png" });
  }

  // Download SVG
  downloadSVG() {
    if (!this.currentSVGData) return;

    const blob = new Blob([this.currentSVGData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

    link.download = `qr-code-${timestamp}.svg`;
    link.href = url;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);

    this.showToast("SVG downloaded successfully!", "success");
    this.trackEvent("download", { format: "svg" });
  }

  // Handle logo upload
  handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.showToast("Logo file too large. Maximum size: 2MB", "error");
      e.target.value = "";
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      this.showToast("Please select a valid image file", "error");
      e.target.value = "";
      return;
    }

    // Update file label
    const label = e.target.nextElementSibling.querySelector(".file-text");
    label.textContent = file.name;

    this.showToast("Logo uploaded successfully!", "success");
  }

  // Form validation
  validateForm() {
    const text = this.elements.qrText.value.trim();
    const isValid = text.length > 0;

    // Update button state
    this.elements.generateBtn.disabled = !isValid;

    // URL validation for better UX
    if (text && this.isURL(text)) {
      this.elements.qrText.type = "url";
    } else {
      this.elements.qrText.type = "text";
    }

    return isValid;
  }

  // Check if text is a URL
  isURL(text) {
    try {
      new URL(text);
      return true;
    } catch {
      return text.startsWith("http://") || text.startsWith("https://");
    }
  }

  // Theme management
  initializeTheme() {
    const savedTheme = localStorage.getItem("qr-generator-theme") || "light";
    this.setTheme(savedTheme);
  }

  toggleTheme() {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("qr-generator-theme", theme);

    // Update theme toggle icon
    const icon = this.elements.themeToggle.querySelector(".theme-icon");
    icon.textContent = theme === "dark" ? "☀️" : "🌙";

    // Update meta theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    metaTheme.content = theme === "dark" ? "#0f172a" : "#1a73e8";
  }

  // Loading state management
  setLoading(loading) {
    this.elements.generateBtn.classList.toggle("loading", loading);
    this.elements.generateBtn.disabled = loading;

    if (loading) {
      this.elements.downloadSection.classList.remove("visible");
      this.elements.qrResult.style.display = "none";
    }
  }

  // Toast notifications
  showToast(message, type = "info") {
    const toast = this.elements.toast;

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add("show");

    // Auto-hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // Keyboard navigation
  handleKeyboard(e) {
    // Generate on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!this.elements.generateBtn.disabled) {
        this.handleFormSubmit(e);
      }
    }

    // Theme toggle on Ctrl/Cmd + D
    if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      e.preventDefault();
      this.toggleTheme();
    }
  }

  // Initialize FAQ interactivity
  initializeFAQ() {
    const faqQuestions = document.querySelectorAll(".faq-question");

    faqQuestions.forEach((question) => {
      question.addEventListener("click", () => {
        const isExpanded = question.getAttribute("aria-expanded") === "true";
        const answer = question.nextElementSibling;

        // Close all other FAQs
        faqQuestions.forEach((otherQuestion) => {
          if (otherQuestion !== question) {
            otherQuestion.setAttribute("aria-expanded", "false");
            otherQuestion.nextElementSibling.classList.remove("active");
          }
        });

        // Toggle current FAQ
        question.setAttribute("aria-expanded", !isExpanded);
        answer.classList.toggle("active");
      });
    });
  }

  // Save form data to localStorage
  saveFormData() {
    const formData = {
      qrText: this.elements.qrText.value,
      qrSize: this.elements.qrSize.value,
    };

    localStorage.setItem("qr-generator-form", JSON.stringify(formData));
  }

  // Load saved form data
  loadFormData() {
    try {
      const saved = localStorage.getItem("qr-generator-form");
      if (saved) {
        const formData = JSON.parse(saved);

        if (formData.qrText) this.elements.qrText.value = formData.qrText;
        if (formData.qrSize) this.elements.qrSize.value = formData.qrSize;
      }
    } catch (error) {
      console.warn("Failed to load saved form data:", error);
    }
  }

  // Analytics tracking (privacy-friendly)
  trackEvent(event, data = {}) {
    // Simple client-side analytics without external services
    if (typeof gtag !== "undefined") {
      gtag("event", event, data);
    }

    console.log("Event tracked:", event, data);
  }

  // Register service worker for PWA
  async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          "./service-worker.js"
        );
        console.log(
          "ServiceWorker registered successfully:",
          registration.scope
        );

        // Handle updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              this.showToast(
                "App updated! Refresh to use the latest version.",
                "info"
              );
            }
          });
        });
      } catch (error) {
        console.log("ServiceWorker registration failed:", error);
      }
    }
  }
}

// Initialize application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new QRGenerator();
});

// Handle online/offline status
window.addEventListener("online", () => {
  document.body.classList.remove("offline");
});

window.addEventListener("offline", () => {
  document.body.classList.add("offline");
});

// Performance optimization: Preload QR library
const link = document.createElement("link");
link.rel = "preload";
link.href = "https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js";
link.as = "script";
document.head.appendChild(link);

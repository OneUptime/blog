# How to Install Fonts in Docker Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Fonts, Images, DevOps, PDF Generation, Headless Chrome

Description: A practical guide to installing system fonts and custom fonts in Docker images for PDF generation, image rendering, and headless browsers.

---

Most Docker base images ship with zero fonts installed. That is perfectly fine until your application needs to generate PDFs, render images with text, run headless Chrome for screenshots, or produce charts. Without the right fonts, you get missing characters, empty boxes, or garbled text in your output.

This guide walks through installing both system font packages and custom fonts in Docker containers. We cover Debian, Ubuntu, Alpine, and Red Hat-based images with real examples you can copy into your Dockerfiles.

## Why Fonts Matter in Containers

Containers strip out everything that is not essential for running server processes. Fonts fall into the "not essential" category for most workloads, so base images exclude them. But several common use cases depend on fonts being present:

- PDF generation with libraries like wkhtmltopdf, Puppeteer, or WeasyPrint
- Server-side image rendering with tools like ImageMagick or Pillow
- Headless browser automation with Playwright or Selenium
- Chart generation with matplotlib, Chart.js (rendered server-side), or similar tools
- Document conversion with LibreOffice in headless mode

If your application does any of these things inside a container, you need fonts.

## Installing Standard Font Packages on Debian/Ubuntu

Debian and Ubuntu provide several font meta-packages that cover common needs.

Install the most commonly needed font families:

```dockerfile
# Install standard fonts on Debian/Ubuntu
FROM ubuntu:22.04

# Install core font packages
# - fonts-liberation: metric-compatible replacements for Arial, Times, Courier
# - fonts-dejavu-core: widely used sans-serif and serif fonts
# - fontconfig: font configuration and cache utility
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        fonts-liberation \
        fonts-dejavu-core \
        fonts-noto-core \
        fontconfig && \
    rm -rf /var/lib/apt/lists/* && \
    fc-cache -fv

CMD ["fc-list"]
```

The `fc-cache -fv` command rebuilds the font cache so applications can discover newly installed fonts without delay.

## Installing Microsoft-Compatible Fonts

Many documents and templates assume Microsoft fonts like Arial, Times New Roman, and Courier New are available. The `fonts-liberation` package provides metric-compatible alternatives, but if you need the actual Microsoft core fonts, you can install them.

Install Microsoft TrueType core fonts on Debian/Ubuntu:

```dockerfile
# Install Microsoft-compatible TrueType fonts
FROM debian:bookworm-slim

# Accept the EULA non-interactively and install msttcorefonts
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        software-properties-common && \
    echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | \
        debconf-set-selections && \
    apt-get install -y --no-install-recommends \
        ttf-mscorefonts-installer && \
    rm -rf /var/lib/apt/lists/* && \
    fc-cache -fv
```

The `debconf-set-selections` line pre-accepts the Microsoft EULA so the installation does not hang waiting for interactive input.

## Installing Fonts on Alpine Linux

Alpine uses a different package manager and has its own set of font packages.

Install fonts on an Alpine-based image:

```dockerfile
# Install fonts on Alpine Linux
FROM alpine:3.19

# Install font packages available in Alpine repositories
# - ttf-freefont: free equivalents of common fonts
# - ttf-dejavu: DejaVu font family
# - fontconfig: font configuration library
RUN apk add --no-cache \
        ttf-freefont \
        ttf-dejavu \
        ttf-liberation \
        fontconfig && \
    fc-cache -fv

CMD ["fc-list"]
```

Alpine also provides `font-noto` for broad Unicode coverage, which is useful if your application handles text in multiple languages.

## Installing CJK (Chinese, Japanese, Korean) Fonts

Applications that handle East Asian text need CJK font packages. Without them, CJK characters render as empty rectangles.

Install CJK fonts on Debian/Ubuntu:

```dockerfile
# Install CJK fonts for Chinese, Japanese, Korean text support
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        fonts-noto-cjk \
        fonts-noto-cjk-extra \
        fontconfig && \
    rm -rf /var/lib/apt/lists/* && \
    fc-cache -fv
```

For Alpine, the equivalent package is `font-noto-cjk`:

```dockerfile
# CJK fonts on Alpine
FROM alpine:3.19

RUN apk add --no-cache \
        font-noto-cjk \
        fontconfig && \
    fc-cache -fv
```

## Installing Custom Fonts from Files

When your application uses proprietary or custom fonts, you need to copy the font files directly into the image.

Add custom font files to the system font directory:

```dockerfile
# Install custom fonts from local files
FROM debian:bookworm-slim

# Install fontconfig for font management
RUN apt-get update && \
    apt-get install -y --no-install-recommends fontconfig && \
    rm -rf /var/lib/apt/lists/*

# Create a custom fonts directory
RUN mkdir -p /usr/local/share/fonts/custom

# Copy your font files into the container
# Supports .ttf, .otf, .woff, and .woff2 formats
COPY fonts/*.ttf /usr/local/share/fonts/custom/
COPY fonts/*.otf /usr/local/share/fonts/custom/

# Set proper permissions and rebuild font cache
RUN chmod 644 /usr/local/share/fonts/custom/* && \
    fc-cache -fv
```

Your project directory should look like this:

```
project/
  Dockerfile
  fonts/
    MyCustomFont-Regular.ttf
    MyCustomFont-Bold.ttf
    MyCustomFont-Italic.otf
```

## Installing Google Fonts

Google Fonts are freely available and cover a wide range of styles. You can download them directly during the build process.

Download and install specific Google Fonts:

```bash
# Download a Google Font family (run locally or in Dockerfile)
# This fetches the Roboto font family
wget -O /tmp/roboto.zip "https://fonts.google.com/download?family=Roboto"
unzip /tmp/roboto.zip -d /usr/local/share/fonts/roboto
fc-cache -fv
```

Here is a complete Dockerfile that installs Google Fonts:

```dockerfile
# Install Google Fonts in a Docker image
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        fontconfig \
        wget \
        unzip && \
    rm -rf /var/lib/apt/lists/*

# Download and install the Roboto font family
RUN wget -q -O /tmp/roboto.zip \
        "https://fonts.google.com/download?family=Roboto" && \
    mkdir -p /usr/local/share/fonts/roboto && \
    unzip /tmp/roboto.zip -d /usr/local/share/fonts/roboto && \
    rm /tmp/roboto.zip && \
    fc-cache -fv
```

## Fonts for Headless Chrome and Puppeteer

Running Puppeteer or Playwright in Docker requires a broad set of fonts to render web pages correctly. Missing fonts cause blank spaces and broken layouts in screenshots and PDFs.

A comprehensive font setup for headless browser images:

```dockerfile
# Font setup for Puppeteer/Playwright headless browser
FROM node:20-slim

# Install all font packages typically needed for web page rendering
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        fonts-liberation \
        fonts-noto-color-emoji \
        fonts-noto-core \
        fonts-noto-cjk \
        fonts-freefont-ttf \
        fontconfig && \
    rm -rf /var/lib/apt/lists/* && \
    fc-cache -fv

# Install Puppeteer (it will use the system-installed Chromium)
RUN npm install puppeteer

COPY generate-pdf.js .
CMD ["node", "generate-pdf.js"]
```

The `fonts-noto-color-emoji` package adds emoji support, which is important for rendering modern web content.

## Verifying Installed Fonts

After installing fonts, verify they are available to applications.

List all installed fonts and search for specific ones:

```bash
# List all installed fonts in the container
docker run --rm my-image fc-list

# Search for a specific font family
docker run --rm my-image fc-list | grep -i "liberation"

# Check if a specific font is available by name
docker run --rm my-image fc-match "Arial"
# Output: LiberationSans-Regular.ttf: "Liberation Sans" "Regular"
```

The `fc-match` command shows which font the system will substitute when a specific font is requested. This is useful for understanding fallback behavior.

## Configuring Font Fallbacks with fontconfig

You can customize how fontconfig handles font substitution by adding a configuration file.

Create a custom fontconfig configuration:

```xml
<!-- /etc/fonts/local.conf - Custom font fallback configuration -->
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
    <!-- Use Liberation Sans as the default sans-serif font -->
    <alias>
        <family>sans-serif</family>
        <prefer>
            <family>Liberation Sans</family>
            <family>DejaVu Sans</family>
            <family>Noto Sans</family>
        </prefer>
    </alias>

    <!-- Use Liberation Serif as the default serif font -->
    <alias>
        <family>serif</family>
        <prefer>
            <family>Liberation Serif</family>
            <family>DejaVu Serif</family>
        </prefer>
    </alias>
</fontconfig>
```

Copy this configuration into your Docker image:

```dockerfile
# Add custom fontconfig to control font fallbacks
COPY local.conf /etc/fonts/local.conf
RUN fc-cache -fv
```

## Multi-Stage Build to Keep Images Small

If you only need fonts for a build step (like generating static assets), use a multi-stage build to avoid shipping font packages in the final image.

Generate assets with fonts in the build stage, then copy only the output:

```dockerfile
# Stage 1: Generate PDFs with full font support
FROM node:20 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        fonts-liberation \
        fonts-noto-core \
        fontconfig && \
    rm -rf /var/lib/apt/lists/* && \
    fc-cache -fv

WORKDIR /app
COPY . .
RUN npm install && npm run generate-pdfs

# Stage 2: Serve the generated files without font packages
FROM nginx:alpine
COPY --from=builder /app/output /usr/share/nginx/html
```

## Troubleshooting Common Font Issues

When fonts are not working as expected, these diagnostic commands help identify the problem:

```bash
# Check if fontconfig can find any fonts at all
docker run --rm my-image fc-list | wc -l

# Verify the font cache is up to date
docker run --rm my-image fc-cache -fv

# Test font rendering with ImageMagick (if installed)
docker run --rm my-image convert -list font

# Check which directories fontconfig searches for fonts
docker run --rm my-image fc-list : file | head -20
```

Common issues include forgetting to run `fc-cache` after installing fonts, copying font files without setting read permissions (chmod 644), and installing font packages without the fontconfig library.

## Summary

Most font problems in Docker containers come down to missing packages. Install `fontconfig` along with the font families your application needs, run `fc-cache -fv` after any font changes, and verify with `fc-list`. For custom fonts, copy the files to `/usr/local/share/fonts/` and rebuild the cache. When image size matters, consider a multi-stage build that keeps font packages only in the build stage.

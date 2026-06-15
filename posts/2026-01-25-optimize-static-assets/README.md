# How to Optimize Static Assets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Performance, Frontend, Web Development, Optimization, CDN

Description: Learn how to optimize static assets for faster page loads. This guide covers minification, compression, image optimization, caching strategies, and CDN configuration for production websites.

---

Static assets often account for 80% or more of page weight. A single unoptimized image can be larger than all your JavaScript combined. Every kilobyte matters for mobile users on slow connections, where oversized assets mean bounced visitors and lost revenue.

This guide covers practical techniques for optimizing JavaScript, CSS, images, and fonts to deliver fast-loading pages.

## Asset Optimization Pipeline

```mermaid
flowchart LR
    A[Source Files] --> B[Build Process]
    B --> C[Minify]
    C --> D[Compress]
    D --> E[Hash Filenames]
    E --> F[CDN Upload]

    subgraph Build
        C
        D
        E
    end
```

| Optimization | Impact | Effort |
|--------------|--------|--------|
| Minification | 20-40% size reduction | Low |
| Compression (gzip/brotli) | 60-80% transfer reduction | Low |
| Image optimization | 50-90% size reduction | Medium |
| Code splitting | Faster initial load | Medium |
| CDN delivery | Lower latency globally | Low |

## JavaScript Optimization

### Minification and Bundling

```javascript
// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  mode: 'production',

  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true
  },

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,    // Remove console.log
            drop_debugger: true,   // Remove debugger statements
            pure_funcs: ['console.info', 'console.debug']
          },
          mangle: true,
          format: {
            comments: false        // Remove comments
          }
        },
        extractComments: false
      })
    ],

    // Split vendor code into separate chunk
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: -10
        },
        common: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    },

    // Extract runtime into separate file
    runtimeChunk: 'single'
  },

  plugins: [
    // Pre-compress for static hosting
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 1024,
      minRatio: 0.8
    }),
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      threshold: 1024,
      minRatio: 0.8,
      compressionOptions: { level: 11 }
    })
  ]
};
```

### Tree Shaking

```javascript
// Ensure ES modules for tree shaking
// package.json
{
  "sideEffects": false
}

// Or specify files with side effects
{
  "sideEffects": [
    "*.css",
    "./src/polyfills.js"
  ]
}

// Import only what you need
// BAD: imports entire library
import _ from 'lodash';

// GOOD: imports only needed function
import get from 'lodash/get';

// Or use lodash-es for better tree shaking
import { get as getFromLodashEs } from 'lodash-es';

const badResult = _.get(obj, 'path');
const goodResult = get(obj, 'path');
const esModuleResult = getFromLodashEs(obj, 'path');
```

### Code Splitting

```jsx
// Dynamic imports for route-based splitting
import React, { Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// Prefetch likely routes
const DashboardPreload = () => import('./pages/Dashboard');

// Trigger prefetch on hover
<Link
  to="/dashboard"
  onMouseEnter={DashboardPreload}
>
  Dashboard
</Link>
```

## CSS Optimization

### Minification and Critical CSS

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),
    require('cssnano')({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: true,
        minifyFontValues: true,
        minifyGradients: true
      }]
    })
  ]
};
```

Extract critical CSS:

```javascript
// Using critical package
const critical = require('critical');

critical.generate({
  base: 'dist/',
  src: 'index.html',
  css: ['dist/styles.css'],
  target: {
    html: 'index.html',
    css: 'critical.css'
  },
  width: 1300,
  height: 900,
  inline: true
});
```

### Purge Unused CSS

```javascript
// tailwind.config.js or postcss.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html'
  ],
  // Tailwind purges unused classes automatically
};

// For other CSS frameworks, use PurgeCSS
const purgecss = require('@fullhuman/postcss-purgecss');

module.exports = {
  plugins: [
    purgecss({
      content: ['./src/**/*.html', './src/**/*.js'],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
      safelist: ['active', 'disabled', /^data-/]
    })
  ]
};
```

## Image Optimization

### Format Selection

| Format | Best For | Browser Support |
|--------|----------|-----------------|
| WebP | Photos, complex images | All modern |
| AVIF | Best compression | Modern Chromium, Firefox, Safari |
| SVG | Icons, logos, illustrations | All |
| PNG | Transparency needed | All |
| JPEG | Photos (fallback) | All |

### Image Processing Pipeline

```javascript
// Using sharp for image processing
const sharp = require('sharp');
const glob = require('glob');
const path = require('path');
const fs = require('fs/promises');

async function optimizeImages(inputDir, outputDir) {
  const images = glob.sync(`${inputDir}/**/*.{jpg,jpeg,png}`);

  for (const imagePath of images) {
    const filename = path.basename(imagePath, path.extname(imagePath));
    const relativePath = path.relative(inputDir, path.dirname(imagePath));
    const outDir = path.join(outputDir, relativePath);

    await fs.mkdir(outDir, { recursive: true });

    // Create WebP version
    await sharp(imagePath)
      .webp({ quality: 80 })
      .toFile(path.join(outDir, `${filename}.webp`));

    // Create AVIF version
    await sharp(imagePath)
      .avif({ quality: 65 })
      .toFile(path.join(outDir, `${filename}.avif`));

    // Create optimized JPEG fallback
    await sharp(imagePath)
      .jpeg({ quality: 85, progressive: true })
      .toFile(path.join(outDir, `${filename}.jpg`));

    // Create responsive sizes
    const sizes = [320, 640, 960, 1280, 1920];
    for (const width of sizes) {
      await sharp(imagePath)
        .resize({ width, withoutEnlargement: true })
        .avif({ quality: 65 })
        .toFile(path.join(outDir, `${filename}-${width}w.avif`));

      await sharp(imagePath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(outDir, `${filename}-${width}w.webp`));

      await sharp(imagePath)
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: 85, progressive: true })
        .toFile(path.join(outDir, `${filename}-${width}w.jpg`));
    }

    console.log(`Processed: ${imagePath}`);
  }
}

optimizeImages('./src/images', './dist/images');
```

### Responsive Images in HTML

```html
<!-- Modern approach with multiple formats and sizes -->
<picture>
  <!-- AVIF for best compression (if supported) -->
  <source
    type="image/avif"
    srcset="
      /images/hero-320w.avif 320w,
      /images/hero-640w.avif 640w,
      /images/hero-960w.avif 960w,
      /images/hero-1280w.avif 1280w,
      /images/hero-1920w.avif 1920w
    "
    sizes="(max-width: 768px) 100vw, 50vw"
  >

  <!-- WebP for broad support -->
  <source
    type="image/webp"
    srcset="
      /images/hero-320w.webp 320w,
      /images/hero-640w.webp 640w,
      /images/hero-960w.webp 960w,
      /images/hero-1280w.webp 1280w,
      /images/hero-1920w.webp 1920w
    "
    sizes="(max-width: 768px) 100vw, 50vw"
  >

  <!-- JPEG fallback -->
  <img
    src="/images/hero.jpg"
    srcset="
      /images/hero-320w.jpg 320w,
      /images/hero-640w.jpg 640w,
      /images/hero-960w.jpg 960w,
      /images/hero-1280w.jpg 1280w,
      /images/hero-1920w.jpg 1920w
    "
    sizes="(max-width: 768px) 100vw, 50vw"
    alt="Hero image"
    loading="lazy"
    decoding="async"
    width="1920"
    height="1080"
  >
</picture>
```

### Lazy Loading

```html
<!-- Native lazy loading (modern browsers) -->
<img src="image.jpg" loading="lazy" alt="Description">
```

```javascript
// Intersection Observer fallback
class LazyLoader {
  constructor() {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: '100px',
        threshold: 0
      }
    );

    document.querySelectorAll('[data-src]').forEach(img => {
      this.observer.observe(img);
    });
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        this.observer.unobserve(img);
      }
    });
  }
}

new LazyLoader();
```

## Font Optimization

### Font Loading Strategy

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
```

```css
/* Define fonts with swap display */
@font-face {
  font-family: 'MainFont';
  src: url('/fonts/main.woff2') format('woff2'),
       url('/fonts/main.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* Show fallback immediately, swap when loaded */
}
```

### Subset Fonts

```bash
# Using pyftsubset to create subset containing only needed characters

pyftsubset font.ttf \
  --output-file=font-subset.woff2 \
  --flavor=woff2 \
  --text="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" \
  --layout-features='kern,liga'
```

## Caching Strategy

### Cache Headers

```nginx
# nginx.conf
location ~* \.(js|css)$ {
    # Long cache with content hash in filename
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location ~* \.(jpg|jpeg|png|gif|webp|avif|svg|ico)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location ~* \.(woff|woff2|ttf|otf|eot)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location ~* \.html$ {
    # Short cache for HTML, always revalidate
    add_header Cache-Control "public, max-age=300, must-revalidate";
}
```

### Content Hash in Filenames

```javascript
// webpack.config.js
output: {
  filename: '[name].[contenthash].js',
  chunkFilename: '[name].[contenthash].chunk.js',
  assetModuleFilename: 'assets/[name].[contenthash][ext]'
}
```

## CDN Configuration

### CloudFront Example

```yaml
# cloudfront-distribution.yaml
Resources:
  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt S3Bucket.RegionalDomainName
            S3OriginConfig:
              OriginAccessIdentity: !Sub "origin-access-identity/cloudfront/${CloudFrontOAI}"
          - Id: APIOrigin
            DomainName: api.example.com
            CustomOriginConfig:
              OriginProtocolPolicy: https-only

        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          CachePolicyId: !Ref LongCachePolicy
          Compress: true

        CacheBehaviors:
          # Static assets - long cache
          - PathPattern: /static/*
            TargetOriginId: S3Origin
            ViewerProtocolPolicy: redirect-to-https
            CachePolicyId: !Ref LongCachePolicy
            Compress: true

          # API - no cache
          - PathPattern: /api/*
            TargetOriginId: APIOrigin
            ViewerProtocolPolicy: redirect-to-https
            CachePolicyId: 4135ea2d-6df8-44a3-9df3-4b5a84be39ad # AWS managed CachingDisabled

        CustomErrorResponses:
          - ErrorCode: 404
            ResponseCode: 200
            ResponsePagePath: /index.html

  LongCachePolicy:
    Type: AWS::CloudFront::CachePolicy
    Properties:
      CachePolicyConfig:
        Name: StaticAssetsLongCache
        DefaultTTL: 86400      # 1 day
        MaxTTL: 31536000       # 1 year
        MinTTL: 1
        ParametersInCacheKeyAndForwardedToOrigin:
          EnableAcceptEncodingBrotli: true
          EnableAcceptEncodingGzip: true
          CookiesConfig:
            CookieBehavior: none
          HeadersConfig:
            HeaderBehavior: none
          QueryStringsConfig:
            QueryStringBehavior: none
```

## Measuring Optimization Impact

```javascript
// Performance monitoring
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'resource') {
      console.log(`${entry.name}: ${entry.transferSize} bytes, ${entry.duration}ms`);
    }
  }
});

observer.observe({ entryTypes: ['resource'] });

// Measure Core Web Vitals
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(console.log);
onINP(console.log);
onCLS(console.log);
```

## Summary

Static asset optimization is a systematic process that compounds across multiple techniques.

| Technique | Typical Impact |
|-----------|----------------|
| Minification | 20-40% smaller |
| Compression | 60-80% smaller transfer |
| Image optimization | 50-90% smaller |
| Code splitting | 30-50% faster initial load |
| CDN delivery | 50-200ms latency reduction |
| Proper caching | Near-instant repeat visits |

Start with the highest-impact, lowest-effort optimizations: enable compression, set proper cache headers, and serve from a CDN. Then progressively add minification, image optimization, and code splitting. Measure with Lighthouse and real user monitoring to quantify improvements.

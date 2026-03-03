# How to Install Docusaurus for Documentation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Documentation, Node.js, React, DevOps

Description: Learn how to set up Docusaurus on Ubuntu to create and host a modern documentation site with versioning, search, and MDX support for technical projects.

---

Docusaurus is a static site generator built by Meta and designed specifically for documentation. It generates a fast React-based site from Markdown (or MDX) files, with built-in support for versioned documentation, a sidebar, full-text search, and a clean default theme. It's widely used for open-source project documentation and internal technical docs.

The output is a static site - a directory of HTML, CSS, and JavaScript files that you can serve with any web server or push to a CDN. This post covers setting up Docusaurus on Ubuntu for local development and production deployment.

## Prerequisites

- Ubuntu 20.04 or 22.04
- Node.js 18+ (Docusaurus requires it)
- npm or yarn

## Installing Node.js

```bash
# Install Node.js 20 LTS using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Creating a New Docusaurus Site

```bash
# Create a new Docusaurus project
# This uses the classic template which includes docs, blog, and a landing page
npx create-docusaurus@latest my-docs classic

# Navigate into the project
cd my-docs

# Start the development server
npm start
```

The development server starts at `http://localhost:3000`. It has hot reload - changes to Markdown files appear immediately in the browser.

## Project Structure

```text
my-docs/
├── blog/                    # Blog posts (optional, can be disabled)
│   └── 2024-01-01-hello.md
├── docs/                    # Documentation pages
│   ├── intro.md
│   └── tutorial-basics/
│       ├── _category_.json  # Sidebar category config
│       └── create-a-page.md
├── src/
│   ├── components/          # Custom React components
│   ├── css/                 # Custom CSS
│   └── pages/               # Custom pages
├── static/                  # Static files (images, etc.)
├── docusaurus.config.js     # Main configuration
├── sidebars.js              # Sidebar configuration
└── package.json
```

## Configuring Docusaurus

The main config file is `docusaurus.config.js`:

```javascript
// docusaurus.config.js
const config = {
  title: 'My Project Docs',
  tagline: 'Complete documentation for My Project',
  favicon: 'img/favicon.ico',

  // Set the production URL of your site
  url: 'https://docs.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/',

  // GitHub Pages deployment config (if using GitHub Pages)
  organizationName: 'your-org',
  projectName: 'my-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Internationalization
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Enable editing links back to source
          editUrl: 'https://github.com/your-org/my-docs/tree/main/',
          // Show last update time and author
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: {
          showReadingTime: true,
          // Disable blog if not needed:
          // blog: false,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    // Navigation bar
    navbar: {
      title: 'My Project',
      logo: {
        alt: 'My Project Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/your-org/my-project',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    // Footer configuration
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} My Project.`,
    },
    // Enable syntax highlighting for code blocks
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/dracula'),
      additionalLanguages: ['bash', 'yaml', 'python', 'go'],
    },
  },
};

module.exports = config;
```

## Writing Documentation

Documentation files are Markdown files in the `docs/` directory. Each file has optional front matter:

```markdown
---
id: getting-started
title: Getting Started
sidebar_label: Getting Started
sidebar_position: 1
description: How to get started with My Project
tags:
  - installation
  - quickstart
---

# Getting Started

Content goes here...
```

### Organizing the Sidebar

The sidebar can be auto-generated from the directory structure, or configured manually in `sidebars.js`:

```javascript
// sidebars.js
const sidebars = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/installation', 'getting-started/configuration'],
    },
    {
      type: 'category',
      label: 'API Reference',
      link: {
        type: 'generated-index',
        description: 'Complete API reference',
      },
      items: [
        {
          type: 'autogenerated',
          dirName: 'api',
        },
      ],
    },
  ],
};

module.exports = sidebars;
```

### Using MDX

Docusaurus supports MDX - Markdown with JSX. This lets you embed interactive components:

```mdx
---
title: Interactive Demo
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installation

<Tabs groupId="operating-systems">
  <TabItem value="ubuntu" label="Ubuntu">

```bash
sudo apt install my-project
```

  </TabItem>
  <TabItem value="macos" label="macOS">

```bash
brew install my-project
```

  </TabItem>
</Tabs>
```text

## Adding Search

Docusaurus supports Algolia DocSearch (recommended for production) or local search plugins:

```bash
# Install local search plugin for offline/self-hosted search
npm install @easyops-cn/docusaurus-search-local
```

In `docusaurus.config.js`:

```javascript
themes: [
  [
    require.resolve('@easyops-cn/docusaurus-search-local'),
    {
      hashed: true,
      language: ['en'],
    },
  ],
],
```

## Building for Production

```bash
# Build the static site
npm run build

# The output is in the build/ directory
ls -la build/

# Test the production build locally
npm run serve

# The site is now at http://localhost:3000
```

## Deploying with nginx

For a production deployment, serve the static build with nginx:

```bash
# Copy the build directory to the web root
sudo cp -r build/* /var/www/docs/
sudo chown -R www-data:www-data /var/www/docs/

# Create nginx config
sudo tee /etc/nginx/sites-available/docs << 'EOF'
server {
    listen 80;
    server_name docs.example.com;

    root /var/www/docs;
    index index.html;

    # Docusaurus uses client-side routing - serve index.html for any missing file
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache HTML files
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store";
    }

    access_log /var/log/nginx/docs.access.log;
    error_log /var/log/nginx/docs.error.log;
}
EOF

sudo ln -s /etc/nginx/sites-available/docs /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Automating Deployment with a Git Hook

For a simple continuous deployment workflow:

```bash
# On the server, create a bare git repository
sudo mkdir -p /srv/docs-repo.git
cd /srv/docs-repo.git
sudo git init --bare

# Create a post-receive hook
sudo tee /srv/docs-repo.git/hooks/post-receive << 'EOF'
#!/bin/bash
set -e

# Check out the latest code
GIT_WORK_TREE=/srv/docs-workspace git checkout -f

# Build the documentation
cd /srv/docs-workspace
npm install
npm run build

# Deploy to web root
sudo rsync -a --delete build/ /var/www/docs/
sudo chown -R www-data:www-data /var/www/docs/

echo "Deployment complete"
EOF

sudo chmod +x /srv/docs-repo.git/hooks/post-receive
```

On your local machine:

```bash
# Add the server as a remote
git remote add deploy user@server.example.com:/srv/docs-repo.git

# Push to deploy
git push deploy main
```

## Document Versioning

Docusaurus supports versioned documentation - useful when your project has multiple active release versions:

```bash
# Create a new version snapshot
npm run docusaurus docs:version 1.0

# This creates:
# versioned_docs/version-1.0/
# versioned_sidebars/version-1.0-sidebars.json
# Updates versions.json
```

The current `docs/` directory becomes "next" (unreleased), and the snapshot becomes the default displayed version.

Docusaurus is a well-designed tool that gets the basics right: fast static output, good defaults for technical documentation, version support, and an active maintenance cycle. For a project with growing documentation needs, it scales well from a small getting-started guide to a comprehensive multi-section reference.

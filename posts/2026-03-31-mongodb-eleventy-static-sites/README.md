# How to Use MongoDB with Eleventy for Static Sites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Eleventy, Static Site, JavaScript, Node.js

Description: Learn how to use MongoDB as a data source for Eleventy (11ty) static site generation using global data files and JavaScript data sources.

---

## How Eleventy Handles External Data

Eleventy (11ty) uses a `_data` directory for global data that is available to all templates. JavaScript files in `_data` can be async functions, meaning you can fetch data from MongoDB at build time and make it available to every page template. This makes Eleventy extremely flexible as a static site generator backed by any data source.

## Project Setup

```bash
mkdir eleventy-mongodb && cd eleventy-mongodb
npm init -y
npm install @11ty/eleventy mongodb dotenv luxon
```

Create the project structure:

```text
_data/
  posts.js
  config.js
_includes/
  base.njk
posts/
  posts.11tydata.json
index.njk
.eleventy.js
.env
```

## MongoDB Data Source in _data

Create a JavaScript data file that fetches from MongoDB at build time:

```javascript
// _data/posts.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

module.exports = async function () {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('myblog');

    const posts = await db.collection('posts')
      .find({ published: true })
      .sort({ publishedAt: -1 })
      .project({
        title: 1,
        slug: 1,
        excerpt: 1,
        body: 1,
        publishedAt: 1,
        tags: 1,
        author: 1
      })
      .toArray();

    // Convert ObjectId to string for template compatibility
    return posts.map(post => ({
      ...post,
      _id: post._id.toString(),
      url: `/posts/${post.slug}/`,
      date: new Date(post.publishedAt)
    }));
  } finally {
    await client.close();
  }
};
```

## Multiple Collections as Data Sources

```javascript
// _data/site.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

module.exports = async function () {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('myblog');

    const [categories, authors, settings] = await Promise.all([
      db.collection('categories').find().toArray(),
      db.collection('authors').find({}, { projection: { password: 0 } }).toArray(),
      db.collection('settings').findOne({ key: 'global' })
    ]);

    return {
      categories: categories.map(c => ({ ...c, _id: c._id.toString() })),
      authors: authors.map(a => ({ ...a, _id: a._id.toString() })),
      title: settings?.siteTitle || 'My Blog',
      description: settings?.siteDescription || ''
    };
  } finally {
    await client.close();
  }
};
```

## Using Data in Nunjucks Templates

```njk
<!-- index.njk -->
---
layout: base.njk
title: Blog
---

<h1>{{ site.title }}</h1>
<p>{{ site.description }}</p>

<div class="posts">
  {% for post in posts %}
  <article>
    <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
    <time datetime="{{ post.date | dateIso }}">{{ post.date | dateReadable }}</time>
    <p>{{ post.excerpt }}</p>
    {% for tag in post.tags %}
      <span class="tag">{{ tag }}</span>
    {% endfor %}
  </article>
  {% endfor %}
</div>
```

## Generating Individual Post Pages

Use `pagination` with a MongoDB data source to generate one page per document:

```njk
---
pagination:
  data: posts
  size: 1
  alias: post
permalink: "/posts/{{ post.slug }}/index.html"
layout: base.njk
---

<article>
  <h1>{{ post.title }}</h1>
  <p>By {{ post.author }} on {{ post.date | dateReadable }}</p>
  {{ post.body | safe }}
</article>
```

## Eleventy Configuration

```javascript
// .eleventy.js
const { DateTime } = require('luxon');

module.exports = function (eleventyConfig) {
  // Date filters for templates
  eleventyConfig.addFilter('dateReadable', date =>
    DateTime.fromJSDate(date).toFormat('MMMM d, yyyy')
  );

  eleventyConfig.addFilter('dateIso', date =>
    DateTime.fromJSDate(date).toISO()
  );

  return {
    dir: {
      input: '.',
      output: '_site',
      includes: '_includes',
      data: '_data'
    }
  };
};
```

Build the site:

```bash
npx eleventy
# Or watch mode for development
npx eleventy --serve
```

## Summary

Eleventy's JavaScript data files make MongoDB integration straightforward - fetch data in async data files under `_data/`, transform documents for template compatibility, and use `pagination` to generate individual pages per document. Data is fetched once at build time, so the output is a fully static site. For rebuilds triggered by content changes in MongoDB, use a webhook to trigger your CI/CD pipeline whenever documents are updated.

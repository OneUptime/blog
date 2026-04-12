# How to Implement Multi-Language Content Storage in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Localization, Content, CMS, Internationalization

Description: Learn how to store and query multi-language content in MongoDB using embedded locale maps, separate locale documents, and locale fallback strategies.

---

## Multi-Language Storage Patterns in MongoDB

MongoDB offers three practical approaches for storing multi-language content:

1. **Embedded locale map**: All translations in one document using language codes as keys
2. **Separate locale documents**: One document per locale with a shared content ID
3. **Mixed approach**: Core fields shared, translatable fields in a locale map

Each has tradeoffs between query simplicity, document size, and translation completeness handling.

## Pattern 1: Embedded Locale Map

Store all translations in a single document:

```javascript
// models/Article.js
const mongoose = require('mongoose');

const LocalizedContentSchema = new mongoose.Schema({
  title: String,
  body: String,
  excerpt: String,
  slug: String
}, { _id: false });

const ArticleSchema = new mongoose.Schema({
  // Non-translatable fields
  publishedAt: Date,
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  authorId: mongoose.Schema.Types.ObjectId,
  categories: [String],
  featuredImage: String,

  // Translations map: { en: {...}, fr: {...}, es: {...} }
  translations: {
    type: Map,
    of: LocalizedContentSchema
  },

  // Track which locales have been translated
  availableLocales: [String],

  // Default locale
  defaultLocale: { type: String, default: 'en' }
});

ArticleSchema.index({ 'translations.en.slug': 1 });
ArticleSchema.index({ publishedAt: -1, status: 1 });

module.exports = mongoose.model('Article', ArticleSchema);
```

Creating a multi-language article:

```javascript
const article = await Article.create({
  publishedAt: new Date(),
  status: 'published',
  translations: {
    en: {
      title: 'Getting Started with MongoDB',
      body: 'MongoDB is a document database...',
      excerpt: 'Learn MongoDB basics',
      slug: 'getting-started-with-mongodb'
    },
    fr: {
      title: 'Premiers pas avec MongoDB',
      body: 'MongoDB est une base de données de documents...',
      excerpt: 'Apprendre les bases de MongoDB',
      slug: 'premiers-pas-avec-mongodb'
    }
  }
});
```

## Pattern 2: Separate Locale Documents

Better for large content bodies or independent editorial workflows:

```javascript
// models/Post.js - base document
const PostSchema = new mongoose.Schema({
  status: { type: String, default: 'draft' },
  publishedAt: Date,
  defaultLocale: { type: String, default: 'en' },
  availableLocales: [String],
  createdAt: { type: Date, default: Date.now }
});

// models/PostLocale.js - locale-specific content
const PostLocaleSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', index: true },
  locale: { type: String, required: true, index: true },
  title: String,
  body: String,
  excerpt: String,
  slug: { type: String, index: true },
  metaTitle: String,
  metaDescription: String,
  translatedAt: Date,
  translatedBy: mongoose.Schema.Types.ObjectId
});

PostLocaleSchema.index({ postId: 1, locale: 1 }, { unique: true });
```

## Querying with Locale Fallback

When a translation is missing, fall back to the default locale:

```javascript
async function getArticle(articleId, requestedLocale = 'en', fallbackLocale = 'en') {
  const article = await Article.findById(articleId);
  if (!article) return null;

  // Try requested locale, then fallback
  const translation = article.translations.get(requestedLocale)
    || article.translations.get(fallbackLocale)
    || article.translations.get(article.defaultLocale);

  if (!translation) return null;

  return {
    _id: article._id,
    publishedAt: article.publishedAt,
    locale: article.translations.has(requestedLocale) ? requestedLocale : fallbackLocale,
    ...translation.toObject()
  };
}

// Get articles with missing translations (useful for editorial dashboard)
async function findMissingTranslations(targetLocale = 'fr') {
  return await Article.find({
    status: 'published',
    [`translations.${targetLocale}`]: { $exists: false }
  }).select(`translations.en.title publishedAt`);
}
```

## Adding a New Translation

```javascript
async function addTranslation(articleId, locale, translationData, userId) {
  return await Article.findByIdAndUpdate(
    articleId,
    {
      $set: {
        [`translations.${locale}`]: translationData
      },
      $addToSet: { availableLocales: locale }
    },
    { new: true }
  );
}
```

## Locale-Aware Slug Lookup

```javascript
async function findBySlug(slug, locale = 'en') {
  return await Article.findOne({
    [`translations.${locale}.slug`]: slug,
    status: 'published'
  });
}
```

## Summary

MongoDB's flexible document model supports multi-language content naturally through embedded locale maps (`translations: Map`) or separate locale documents linked by a parent ID. The embedded approach is simpler for content with few translations; separate documents scale better for content with many locales and independent translation workflows. Always implement locale fallback logic to handle missing translations gracefully, and maintain an `availableLocales` array for efficiently querying which locales have been translated without scanning all translation subdocuments.

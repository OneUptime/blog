# Validation Summary: How to Implement Multi-Language Content Storage in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- JavaScript / Node.js

## Sources Consulted
- Mongoose SchemaTypes documentation — Maps: https://mongoosejs.com/docs/schematypes.html#maps
- Mongoose Schema index documentation: https://mongoosejs.com/docs/guide.html#indexes
- MongoDB $exists operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/exists/
- MongoDB $addToSet operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/addToSet/
- Mongoose findByIdAndUpdate documentation: https://mongoosejs.com/docs/api/model.html#Model.findByIdAndUpdate()
- Mongoose strict mode documentation: https://mongoosejs.com/docs/guide.html#strict

## Issues Found
1. **Missing `availableLocales` field on ArticleSchema (Pattern 1)**: The `addTranslation` function used `$addToSet: { availableLocales: locale }` to track available locales, and the Summary section recommended maintaining an `availableLocales` array. However, the `ArticleSchema` definition did not include this field — it was only defined on the `PostSchema` (Pattern 2). With Mongoose's default strict mode enabled, the `$addToSet` operation would be silently ignored, meaning locales would never actually be tracked. **Fix**: Added `availableLocales: [String]` to the `ArticleSchema` definition so the `addTranslation` function works as intended.

## Review Notes
- The index `ArticleSchema.index({ 'translations.en.slug': 1 })` only indexes the English locale's slug. For a production system supporting multiple locales, you would need separate indexes per locale (e.g., `translations.fr.slug`) or use a wildcard index. This is not incorrect as written — just a limitation worth noting.
- All Mongoose Map API usage (`.get()`, `.has()`, `.toObject()`) is correct and current.
- The `$exists: false` query pattern for finding missing translations on Map keys works correctly with MongoDB's dot notation on Map-type fields.
- The French translations shown in the examples are linguistically accurate.

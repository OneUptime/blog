# Validation Summary: MongoDB vs Firebase Firestore: Backend Database Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB (document database, aggregation framework)
- Firebase Firestore (Cloud Firestore, modular v9+ JavaScript SDK)
- MongoDB Atlas (managed hosting, M10 tier pricing)
- MongoDB Atlas App Services (formerly Realm)

## Sources Consulted
- MongoDB official documentation: BSON document size limit (16 MB) — https://www.mongodb.com/docs/manual/reference/limits/
- MongoDB aggregation pipeline documentation ($match, $lookup, $group) — https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- Firebase Firestore documentation: document size limits (1 MiB) — https://firebase.google.com/docs/firestore/quotas
- Firebase Firestore pricing — https://firebase.google.com/pricing
- Firebase Firestore modular SDK (v9+) query API — https://firebase.google.com/docs/firestore/query-data/queries
- Firebase Firestore real-time listeners (onSnapshot) — https://firebase.google.com/docs/firestore/query-data/listen
- MongoDB Atlas pricing — https://www.mongodb.com/pricing
- MongoDB Change Streams documentation — https://www.mongodb.com/docs/manual/changeStreams/

## Issues Found
No technical issues found.

## Review Notes
- The Firestore pricing figures are labeled "approximate" and match published pricing for the nam5 (US multi-region) location. Pricing varies by region, so readers in other regions should check current rates.
- The MongoDB Atlas M10 pricing (~$57/month) is a reasonable ballpark but varies by cloud provider and region. The `~` qualifier appropriately signals this.
- The post correctly states MongoDB lacks native offline sync/real-time listeners in the client-side context. MongoDB does offer server-side Change Streams for real-time notifications, but these serve a different use case than Firestore's client SDK real-time sync, so the comparison is fair.
- MongoDB Atlas App Services (formerly Realm) / Atlas Device Sync has been deprecated by MongoDB. The offline/sync capabilities mentioned may not be available for new projects going forward. This could warrant an update in the future.
- MongoDB Atlas Serverless instances were deprecated in 2024. The post mentions "serverless pricing" for Atlas — this is a minor point since the post doesn't go into detail, but readers should be aware that Atlas Flex clusters replaced serverless instances.

# Validation Summary: How to Choose Between Firestore Native Mode and Datastore Mode for NoSQL on GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Firestore in Native mode
- Firestore in Datastore mode
- Google Cloud Datastore API
- Python Google Cloud client libraries
- Firestore and Datastore indexing configuration
- Firestore and Datastore transactions, consistency, pricing, offline support, and real-time listeners

## Sources Consulted
- Google Cloud documentation: Choosing between Native mode and Datastore mode - https://docs.cloud.google.com/datastore/docs/firestore-or-datastore
- Google Cloud documentation: Firestore quotas and limits - https://docs.cloud.google.com/firestore/quotas
- Google Cloud documentation: Firestore in Datastore mode limits - https://docs.cloud.google.com/datastore/docs/concepts/limits
- Google Cloud documentation: Firestore in Datastore mode transactions - https://docs.cloud.google.com/datastore/docs/concepts/transactions
- Google Cloud documentation: Datastore queries - https://docs.cloud.google.com/datastore/docs/concepts/queries
- Google Cloud Python client documentation: Datastore queries API - https://cloud.google.com/python/docs/reference/datastore/latest/queries
- Google Cloud Python client documentation: Firestore Query API - https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.query.Query
- Google Cloud documentation: Firestore query and filter data - https://cloud.google.com/firestore/docs/query-data/queries
- Firebase documentation: Get real-time updates with Firestore - https://firebase.google.com/docs/firestore/query-data/listen
- Firebase documentation: Access data offline - https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firebase documentation: Understand Cloud Firestore billing - https://firebase.google.com/docs/firestore/pricing

## Issues Found
- The post said mode choice is set per project and cannot be changed. Current Google Cloud documentation says mode is set per database, projects can contain both mode types, and an empty database can be switched between modes. Updated those statements to say mode can only be changed while the database is empty and data otherwise needs migration.
- The Firestore Python examples used positional `.where()` filters. Current official Python samples use `FieldFilter` through the `filter=` keyword. Updated the examples to import and use `FieldFilter`.
- The Datastore Python query example used positional `add_filter()` arguments. Current official Python samples use `PropertyFilter` through the `filter=` keyword. Updated the example accordingly.
- The Datastore example ordered results by `created_at` but did not store a `created_at` property on the entity. Added a timezone-aware timestamp property so the query example is internally consistent.
- The pricing section said Datastore mode has a similar free tier and that per-operation costs are the same. Current Google documentation says both modes use the same pricing structure, while Datastore mode does not charge for small operations. Updated the wording to reflect that nuance.
- The consistency section included an unsupported date-specific claim and omitted the explicit eventual consistency option. Updated it to say Datastore mode queries are strongly consistent unless eventual consistency is explicitly requested.
- The transaction section claimed Native mode transactions can read and write up to 500 documents and Datastore mode transactions can include up to 500 entities. Current official limits emphasize request size, duration, and Datastore concurrency mode behavior rather than those exact entity/document counts. Replaced those claims with current documented limits and the Datastore Optimistic With Entity Groups caveat.
- The `firestore.indexes.json` snippet included a `//` comment inside a JSON block, which is not valid JSON. Moved that description into the surrounding prose.

## Review Notes
The post is technically valid after the fixes. Future updates could add more detail about multi-database projects and the one-free-database-per-project billing rule, but that was not necessary to correct the existing guidance.

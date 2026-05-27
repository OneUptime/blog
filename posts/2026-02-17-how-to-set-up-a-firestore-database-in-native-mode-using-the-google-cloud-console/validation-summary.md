# Validation Summary: How to Set Up a Firestore Database in Native Mode Using the Google Cloud Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Firestore in Native mode
- Google Cloud Console
- Google Cloud CLI
- Firebase Admin SDK for Node.js
- Google Cloud Firestore client libraries for Python and Go
- Cloud Firestore Security Rules
- Firestore composite indexes

## Sources Consulted
- Google Cloud Firestore: Create and manage databases: https://cloud.google.com/firestore/native/docs/manage-databases
- Google Cloud Firestore: Choosing between Native mode and Datastore mode: https://docs.cloud.google.com/datastore/docs/firestore-or-datastore
- Google Cloud Firestore: Overview: https://docs.cloud.google.com/firestore/native/docs/overview
- Google Cloud Firestore: Locations: https://docs.cloud.google.com/firestore/native/docs/locations
- Google Cloud SDK reference: gcloud firestore databases create: https://cloud.google.com/sdk/gcloud/reference/firestore/databases/create
- Google Cloud SDK reference: gcloud firestore indexes composite create: https://cloud.google.com/sdk/gcloud/reference/firestore/indexes/composite/create
- Firebase Admin SDK setup: https://firebase.google.com/docs/admin/setup
- Google Cloud Firestore server timestamp samples: https://docs.cloud.google.com/firestore/docs/samples/firestore-data-set-server-timestamp
- Firebase Cloud Firestore Security Rules structure: https://firebase.google.com/docs/firestore/security/rules-structure
- Firebase locations and privacy documentation: https://firebase.google.com/docs/projects/locations and https://firebase.google.com/support/privacy/

## Issues Found
- The post said the Native mode versus Datastore mode choice cannot be changed after creation. Current Google Cloud documentation says the database type can be changed only while the database is empty. Updated the wording to reflect that limitation.
- The Google Cloud Console setup flow was missing current required choices such as database ID, Firestore edition, data access mode, and initial security rules. Updated the affected setup steps without restructuring the tutorial.
- The multi-region examples omitted `nam7`, which is now listed as a supported Firestore multi-region. Added it to the examples.
- The composite index command comment said it deployed indexes from a configuration file, but the shown command creates one composite index directly. Updated the comment.
- The composite index command used uppercase `ASCENDING` and `DESCENDING`, while the current `gcloud` reference documents `ascending` and `descending`. Updated the example to the documented values.

## Review Notes
The code snippets for Node.js, Python, and Go use current Firestore APIs for creating clients, writing documents, reading documents, and setting server timestamps. The security rules example is syntactically valid and correctly notes that server-side client libraries bypass Firestore Security Rules and rely on IAM/Application Default Credentials.

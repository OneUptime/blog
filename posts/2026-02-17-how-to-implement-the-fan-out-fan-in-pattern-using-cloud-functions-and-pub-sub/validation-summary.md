# Validation Summary: How to Implement the Fan-Out Fan-In Pattern Using Cloud Functions and Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud Pub/Sub
- Google Cloud Storage triggers
- Google Cloud Firestore transactions
- Python 3.11
- Google Cloud CLI

## Sources Consulted
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Functions 1st gen Pub/Sub tutorial: https://cloud.google.com/functions/1stgendocs/tutorials/pubsub-1st-gen
- Google Cloud Functions runtime support: https://cloud.google.com/functions/docs/runtime-support
- Google Cloud Functions Pub/Sub sample for Python background functions: https://cloud.google.com/functions/docs/samples/functions-helloworld-pubsub
- Google Cloud Functions Cloud Storage sample for Python background functions: https://cloud.google.com/functions/docs/samples/functions-helloworld-storage
- Google Cloud Pub/Sub subscription overview: https://cloud.google.com/pubsub/docs/subscription-overview
- Google Cloud Pub/Sub publisher documentation: https://cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub quotas and limits: https://cloud.google.com/pubsub/quotas
- Google Cloud Firestore transaction update sample: https://cloud.google.com/firestore/docs/samples/firestore-transaction-document-update
- Python `csv` module documentation: https://docs.python.org/3/library/csv.html

## Issues Found
- The CSV parsing examples used string splitting, which fails for valid CSV fields containing quoted commas or other CSV escaping. Updated the fan-out function to parse with Python's `csv.reader` and pass parsed rows to the worker.
- The worker recalculated row numbers with a hard-coded chunk size and split rows again with string operations. Updated the fan-out message to include `start_row`, and updated the worker to validate the parsed row arrays.
- The setup step created a manual results subscription and described it as used by the fan-in function. For `gcloud functions deploy --trigger-topic`, Cloud Functions creates and manages the trigger subscription. Replaced the manual subscription command with a note explaining this.
- The fan-in function incremented aggregate counters for every delivered result message, which could overcount on Pub/Sub redelivery. Added `processed_chunks` tracking in Firestore and made the transaction skip duplicate chunk results.

## Review Notes
- The deployment commands use Python 3.11, which remains supported for Cloud Functions / Cloud Run functions as of the review date.
- The function signatures and Pub/Sub payload decoding match the 1st gen Python background function examples. A future update could add a separate Cloud Run functions gen2 version using CloudEvents.

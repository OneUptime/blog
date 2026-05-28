# Validation Summary: How to Migrate Petabytes of On-Premises Data to Google Cloud Storage

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Storage
- Google Transfer Appliance
- Google Cloud CLI
- NFS
- rsync
- Pub/Sub notifications
- Linux shell utilities

## Sources Consulted
- Google Cloud Transfer Appliance overview: https://docs.cloud.google.com/transfer-appliance/docs/4.0/overview
- Google Cloud Transfer Appliance specifications: https://docs.cloud.google.com/transfer-appliance/docs/4.0/specifications
- Google Cloud Transfer Appliance high-level procedure guide: https://docs.cloud.google.com/transfer-appliance/docs/4.0/procedure-guide
- Google Cloud Transfer Appliance transfer data guide: https://docs.cloud.google.com/transfer-appliance/docs/4.0/transfer-data
- Google Cloud Transfer Appliance pricing: https://cloud.google.com/transfer-appliance/pricing
- gcloud storage buckets create reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- gcloud storage buckets notifications create reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/notifications/create
- gcloud storage hash reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/hash

## Issues Found
- The bucket creation examples used `--storage-class`, but the current `gcloud storage buckets create` flag is `--default-storage-class`. Updated all bucket creation commands.
- The preparation section referred to installing Transfer Appliance management software and a client tool. Current documentation describes minimal client software on the source host and the appliance-side Transfer Appliance CLI. Updated the wording.
- The network requirements listed 10 GbE or 25 GbE. Current Transfer Appliance docs list 10 Gbps RJ45, 40 Gbps QSFP+, and 100 Gbps QSFP28 depending on model. Updated the preparation checklist.
- The setup section described a browser-based appliance management UI. Current docs describe an on-device command-line interface and Google Cloud console attestation/credentials. Updated the configuration comments.
- The NFS mount examples used `<appliance-ip>:/transfer`. Current documentation uses the `/mnt/ta_data` export and NFS v4. Updated both mount examples.
- The checksum comparison commands included absolute paths, so `diff` would report mismatches even when file content matched. Updated the commands to generate checksums from matching relative paths in sorted order.
- The finalize step described a generic management tool and omitted the actual `ta finalize` command. Updated it to show `ta finalize`.
- The encryption text said encryption keys are managed by Google. Current docs describe customer-managed encryption keys. Updated the wording to CMEK.
- The return-shipping flow said to schedule shipment through the Google Cloud Console. Current docs say to enter the `ta finalize` passcode in the return instructions form and receive the shipping label from the Transfer Appliance Team. Updated the text.
- The ingestion monitoring section implied detailed console progress and estimated completion. Current docs state the Transfer Appliance Team emails receipt and completion status. Updated the comments.
- The Pub/Sub notification example was technically valid, but would only observe object events after the notification is configured. Updated the wording to configure it before ingestion starts.
- The Cloud Storage hash comparison used the default base64 output from `gcloud storage hash` while comparing against hex `md5sum`. Updated the command to use `--skip-crc32c --hex`.
- The cost section said shipping is included in the appliance fee and omitted current operations costs. Updated pricing bullets to reflect base fee, onsite usage, variable shipping, request charges, Cloud Storage costs, and no Transfer Service fee for physical ingest.

## Review Notes
The transfer duration examples are approximate and depend heavily on source storage performance, file sizes, appliance model, and network interface. The examples are acceptable as rough estimates, but future revisions could make the assumptions more explicit.

# Validation Summary: How to Choose Between Standard Nearline Coldline and Archive Storage Classes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Storage
- Google Cloud Storage storage classes
- Google Cloud Storage Autoclass
- Google Cloud CLI
- Object Lifecycle Management

## Sources Consulted
- Google Cloud Storage pricing: https://cloud.google.com/storage/pricing
- Google Cloud Storage classes: https://cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage Autoclass: https://cloud.google.com/storage/docs/autoclass
- Google Cloud CLI `gcloud storage buckets create`: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud CLI `gcloud storage cp`: https://cloud.google.com/sdk/gcloud/reference/storage/cp

## Issues Found
- The US multi-region pricing table used outdated or region-mismatched operation and storage rates. Updated Standard Class A operations, Nearline storage and Class A operations, Coldline Class A and Class B operations, and Archive storage and Class A operations to match current Google Cloud Storage pricing.
- The 10 TB cost comparison used the old Nearline and Archive storage rates. Updated the Nearline total from about $101/month to about $151/month and the Archive total from about $17/month to about $29/month.
- The Autoclass section said untouched objects gradually move through Nearline, Coldline, and Archive without qualification. Updated it to clarify that Autoclass defaults to Nearline as the terminal storage class, and only continues to Coldline and Archive when Archive is configured as the terminal storage class.

## Review Notes
- The `gcloud storage buckets create --enable-autoclass` and `gcloud storage cp --storage-class=ARCHIVE` examples match current Google Cloud CLI documentation.
- Google Cloud pricing is location-specific and can change over time. The post now matches current US multi-region pricing as of this review date.

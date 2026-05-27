# Validation Summary: How to Prepare for Case Study Questions in the Google Cloud Professional Cloud

## Status
validated

## Post Type
Certification preparation guide

## Technologies Covered
- Google Cloud Professional Cloud Architect certification
- Google Cloud case studies
- Cloud Healthcare API
- Cloud Run
- Google Kubernetes Engine Autopilot
- Cloud SQL
- Cloud Spanner
- Bigtable
- Firestore
- Pub/Sub
- Dataflow
- BigQuery
- Dataproc
- Vertex AI
- Cloud CDN
- Cloud Load Balancing
- Cloud Armor
- VPC Service Controls

## Sources Consulted
- Google Cloud Professional Cloud Architect certification page: https://cloud.google.com/learn/certification/cloud-architect/
- Google Cloud Professional Cloud Architect exam guide: https://cloud.google.com/learn/certification/guides/professional-cloud-architect
- Cloud Healthcare API overview: https://cloud.google.com/healthcare-api/docs/introduction
- Connected device architectures on Google Cloud: https://cloud.google.com/architecture/connected-devices/iot-core-migration
- IoT platform product architecture on Google Cloud: https://cloud.google.com/iot-core
- Device on Pub/Sub connection to Google Cloud: https://cloud.google.com/architecture/connected-devices/device-pubsub-architecture
- Pub/Sub overview: https://cloud.google.com/pubsub/docs/pubsub-basics
- Dataflow overview: https://cloud.google.com/dataflow/docs/overview
- BigQuery Storage Write API overview: https://cloud.google.com/bigquery/docs/write-api
- BigQuery streaming data documentation: https://cloud.google.com/bigquery/docs/write-api-streaming
- Bigtable overview: https://cloud.google.com/bigtable/docs/overview
- Bigtable product page: https://cloud.google.com/bigtable
- Cloud Run overview: https://cloud.google.com/run/docs/overview/what-is-cloud-run
- GKE Autopilot overview: https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-overview
- Cloud Spanner API reference overview: https://cloud.google.com/spanner/docs/reference/rest

## Issues Found
- The IoT data ingestion row listed Cloud IoT Core. Cloud IoT Core was discontinued on August 16, 2023 and is not a current Google Cloud service option. Replaced it with Pub/Sub, Dataflow, and MQTT broker or IoT platform architectures, which match current Google Cloud connected device architecture guidance.
- The global low latency row listed Cloud Armor. Cloud Armor is a security service, not a primary low-latency delivery service. Replaced it with Cloud Load Balancing while leaving Cloud CDN and multi-region deployments.
- The Bigtable comparison said Bigtable has "no SQL support." Bigtable now supports SQL query capabilities, although it is not a traditional relational SQL database. Updated the wording to avoid the outdated claim.
- The BigQuery comparison said BigQuery is "not for real-time processing." BigQuery supports streaming ingestion and real-time analytics use cases. Updated the wording to clarify that BigQuery is not a general-purpose stream processing engine.

## Review Notes
The certification case study list matches the current Professional Cloud Architect exam guide. The certification page says each standard exam includes 2 case studies and case study questions make up 20-30% of the exam; the post's "5 to 10 questions per case study" guidance is consistent with that range as practical exam-prep advice.

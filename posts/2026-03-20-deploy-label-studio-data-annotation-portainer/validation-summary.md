# Validation Summary: How to Deploy Label Studio for Data Annotation via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Label Studio (heartexlabs/label-studio Docker image, v1.11.0)
- Portainer (Docker Compose stack deployment)
- Docker / Docker Compose
- PostgreSQL 16 (alpine)
- MinIO / S3 cloud storage
- Label Studio REST API (projects, storages, predictions, exports)
- Label Studio XML labeling configuration (View, Text, Choices)
- Python `requests` library

## Sources Consulted
- [Label Studio API Reference - Create prediction](https://api.labelstud.io/api-reference/api-reference/predictions/create)
- [Label Studio API Reference - Create new S3 storage](https://api.labelstud.io/api-reference/api-reference/import-storage/s-3/create)
- [Label Studio Documentation - Database Storage Setup](https://labelstud.io/guide/storedata)
- [Label Studio Documentation - Export Annotations](https://labelstud.io/guide/export.html)
- [Label Studio Documentation - Predictions](https://labelstud.io/guide/predictions)
- [Label Studio Documentation - Cloud Storage Integration](https://labelstud.io/guide/storage.html)
- [Official Label Studio docker-compose.yml](https://github.com/HumanSignal/label-studio/blob/develop/docker-compose.yml)
- [Label Studio GitHub Releases](https://github.com/HumanSignal/label-studio/releases)

## Issues Found
1. **Wrong S3 storage field name (`endpoint_url` → `s3_endpoint`)** — In Step 2, the storage configuration used `endpoint_url` to specify a custom S3 endpoint. The Label Studio API expects this field to be named `s3_endpoint` per the official import-storage S3 schema. Without this fix, the MinIO endpoint would be ignored and the request would attempt to reach AWS S3. Fixed.

2. **Storage API endpoint missing trailing slash** — Updated `/api/storages/s3` to `/api/storages/s3/`. While Django's `APPEND_SLASH` setting often handles this transparently, the documented endpoint includes the trailing slash and using it directly avoids the redirect. Fixed.

3. **Wrong predictions API endpoint and body format** — In Step 5, the post POSTed to `/api/tasks/{task_id}/predictions` with a body of `{"predictions": [...]}`. This is not a valid Label Studio API endpoint. The correct endpoint is `POST /api/predictions/`, and it accepts a single prediction object with a top-level `task` field (the task ID), `result`, `score`, and `model_version`. The example was rewritten to use the correct endpoint and payload shape.

4. **Prediction `result` items missing `from_name` and `to_name`** — The example prediction `result` only contained `type` and `value`. Per the Label Studio prediction format, each result item must include `from_name` and `to_name` matching the labeling configuration so the prediction can be mapped to the correct UI control. Added `from_name: "sentiment"` and `to_name: "text"` to align with the `label_config` declared in Step 3.

5. **Pascal VOC export use case mislabeled** — The post described Pascal VOC as "XML format for image classification". Per the Label Studio export documentation, Pascal VOC XML in Label Studio is for object detection and image segmentation tasks (it is bounding-box / mask-based, not classification). Updated the description.

## Review Notes
- The PostgreSQL environment variables (`POSTGRE_NAME`, `POSTGRE_USER`, `POSTGRE_PASSWORD`, `POSTGRE_PORT`, `POSTGRE_HOST`, `DJANGO_DB`) are intentionally spelled without the trailing `S` and are correct as documented in the official `docker-compose.yml`.
- The pinned image `heartexlabs/label-studio:1.11.0` is a real published tag but is significantly behind current releases (Label Studio reached 1.23.0 by March 2025). Readers may want to pin to a more recent tag for security fixes and feature parity. The configuration shown remains compatible with both 1.11.0 and current versions.
- The Compose file uses `version: "3.8"` — Compose v2 ignores the `version` key, so this is harmless but unnecessary.
- The synchronous export endpoint `GET /api/projects/{id}/export?exportType=...` shown in Step 4 still works for self-hosted open-source Label Studio. In Label Studio Enterprise this endpoint is deprecated in favor of the async export API (`POST /api/projects/{id}/exports/`); readers running Enterprise should switch to that flow.
- The MinIO secrets (`aws_secret_access_key`, `POSTGRE_PASSWORD`) are placeholders — production deployments should source them from a secrets manager rather than hard-coding them in the Compose file or scripts.

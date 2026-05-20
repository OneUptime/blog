# Validation Summary: How to Deploy Ollama with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ollama
- Argo CD
- Kubernetes Deployments, Services, PVCs, Ingress, ConfigMaps, and CronJobs
- NVIDIA GPU scheduling on Kubernetes
- ingress-nginx
- Python requests
- OpenAI Python client against Ollama's OpenAI-compatible API
- Shell scripting for init containers

## Sources Consulted
- Ollama Docker documentation: https://docs.ollama.com/docker
- Ollama API introduction: https://docs.ollama.com/api/introduction
- Ollama Generate API: https://docs.ollama.com/api/generate
- Ollama Chat API: https://docs.ollama.com/api/chat
- Ollama Pull API: https://docs.ollama.com/api/pull
- Ollama List Models API: https://docs.ollama.com/api/tags
- Ollama List Running Models API: https://docs.ollama.com/api/ps
- Ollama OpenAI compatibility documentation: https://docs.ollama.com/api/openai-compatibility
- Ollama Modelfile reference: https://docs.ollama.com/modelfile
- Ollama FAQ for keep-alive and concurrency settings: https://docs.ollama.com/faq
- Ollama GitHub releases: https://github.com/ollama/ollama/releases/latest
- Kubernetes GPU scheduling documentation: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The post pinned Ollama to `ollama/ollama:0.1.27`, which is very old for a 2026 deployment guide. Updated the examples to `ollama/ollama:0.24.0`, the latest GitHub release found during review.
- The introduction said Ollama handles quantization as part of simple Docker serving. Ollama can create quantized models, but the deployment examples are about pulling and serving existing model artifacts, so this was changed to "model management."
- The post said Ollama downloads models on first request. Ollama's API has a separate pull endpoint, and missing models can return not-found errors; the first request primarily loads an already available model into memory. Updated the preload wording and best-practice note.
- The ConfigMap and custom-model init-container scripts used `kill %1`, which depends on shell job-control behavior and is fragile in non-interactive container shells. Updated both scripts to capture `SERVER_PID=$!` and kill that PID explicitly.
- The custom-model preload loop skipped empty lines but not comments, while the earlier ConfigMap script supported comments. Added the same comment skip logic for consistency.
- The "add a model" example appended to `models.txt`, but the post's GitOps source of truth is the embedded `models.txt` key inside `apps/ollama/model-config.yaml`. Updated the command sequence to edit the ConfigMap file and then commit it.
- The monitoring example used `/api/tags` while describing loaded models. Ollama documents `/api/tags` as available local models and `/api/ps` as models currently loaded/running, so the snippet now calls `/api/ps`.
- The CronJob used `$SLACK_WEBHOOK` without defining it. Added a `secretKeyRef` environment variable and guarded the curl call so the snippet is operational when the Secret is present.
- The ingress example referenced a basic-auth Secret without noting that it must exist. Added a short prerequisite sentence before the snippet.

## Review Notes
The Kubernetes GPU resource examples correctly keep `nvidia.com/gpu` requests and limits equal, matching Kubernetes extended resource requirements. The Argo CD `ignoreDifferences` example matches the documented application-level JSON pointer format. The `gp3`, `efs`, GPU node labels, TLS Secret, Slack Secret, and ingress auth Secret remain environment-specific placeholders that must match the target cluster.

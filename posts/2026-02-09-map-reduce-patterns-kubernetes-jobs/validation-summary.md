# Validation Summary: How to Implement Map-Reduce Patterns Using Kubernetes Jobs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Jobs
- Kubernetes Indexed Jobs
- Kubernetes RBAC
- kubectl wait and JSONPath output
- Python
- JavaScript and Node.js
- node-postgres
- Bash

## Sources Consulted
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes indexed Job task documentation: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Python collections.Counter documentation: https://docs.python.org/3/library/collections.html#collections.Counter
- Node.js filesystem documentation: https://nodejs.org/api/fs.html
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool
- node-postgres pooling guide: https://node-postgres.com/features/pooling

## Issues Found
- The Kubernetes manifest used an in-cluster `kubectl wait` init container but did not define the ServiceAccount, Role, and RoleBinding required to read Job resources. Added minimal RBAC for a `job-waiter` service account with `get`, `list`, and `watch` permissions on `batch` Jobs.
- The mapper Job could start before the splitter Job completed if the manifests were applied together. Added a `wait-for-splitter` init container to the mapper Job so map pods wait for the split phase to complete.
- The log reducer wrote `/data/output/log_summary.json` without ensuring `/data/output` existed. Added `os.makedirs('/data/output', exist_ok=True)` before the write.
- The database mapper wrote to `/data/intermediate` without ensuring the directory existed. Added `fs.mkdirSync('/data/intermediate', { recursive: true })`.
- The database reducer wrote `/data/output/database_summary.json` without ensuring `/data/output` existed. Added `fs.mkdirSync('/data/output', { recursive: true })`.
- The monitoring script used unquoted Job names and did not handle absent `.status.succeeded`, `.status.active`, or `.status.failed` fields, which are common before a Job has activity. Quoted the Job name and defaulted missing values to `0`.

## Review Notes
The examples are syntactically valid after edits: YAML parsed successfully, Python snippets parsed with `ast`, JavaScript snippets passed `node --check`, and the Bash monitor passed `bash -n`. The examples still assume a suitable `mapreduce-data` PVC, writable shared storage semantics, valid container images, and database credentials supplied through the runtime environment.

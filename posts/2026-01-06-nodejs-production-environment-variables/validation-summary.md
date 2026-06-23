# Validation Summary: How to Configure Node.js for Production with Environment Variables

## Status
validated

## Post Type
Guide

## Technologies Covered
- Node.js environment variables
- dotenv
- npm
- Joi
- Zod
- TypeScript
- AWS Secrets Manager
- HashiCorp Vault KV v2
- Kubernetes Deployments, ConfigMaps, and Secrets
- JSON/package.json scripts

## Sources Consulted
- Twelve-Factor App configuration guidance: https://12factor.net/config
- Node.js environment variables documentation: https://nodejs.org/api/environment_variables.html
- npm install documentation: https://docs.npmjs.com/cli/v9/commands/npm-install/
- dotenv README: https://github.com/motdotla/dotenv
- Joi API documentation: https://joi.dev/api/
- Zod API documentation: https://zod.dev/api
- Zod v4 migration guide: https://zod.dev/v4/changelog
- AWS SDK for JavaScript v3 Secrets Manager GetSecretValueCommand documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/secrets-manager/command/GetSecretValueCommand/
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The sample `JWT_SECRET` values were shorter than the later `min(32)` validation rule. Updated both examples to use values that satisfy the documented minimum length.
- The Zod `PORT` schema used `z.string().transform(Number)`, which can produce `NaN` instead of failing validation for invalid input. Updated it to `z.coerce.number().int().positive().default(3000)`.
- The Zod URL examples used `z.string().url()`, which is deprecated in Zod 4. Updated them to current top-level `z.url()` validators with protocol restrictions for PostgreSQL and Redis URLs.
- The Zod error formatting example used `result.error.format()`, which is deprecated in Zod 4. Updated it to `z.prettifyError(result.error)`.
- The Kubernetes `apps/v1` Deployment example omitted the selector and matching pod template labels required for a valid Deployment. Added `metadata.labels`, `spec.selector.matchLabels`, and matching `spec.template.metadata.labels`.
- The `package.json` example included a JavaScript-style comment inside a `json` code block. Removed the comment so the snippet is valid JSON.

## Review Notes
The AWS Secrets Manager example assumes a JSON string secret in `SecretString`; binary secrets would need separate handling. The Kubernetes Secrets section is technically correct, but production clusters should also follow the official Kubernetes guidance for encryption at rest, least-privilege RBAC, and external secret store providers where appropriate.

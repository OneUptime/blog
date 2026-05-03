# Validation Summary: How to Deploy KServe on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- KServe v0.12.0 (formerly KFServing)
- Rancher (Kubernetes management)
- Knative Serving
- cert-manager
- Kubernetes (kubectl, ServiceAccount, Secret)
- AWS S3 / IRSA (IAM Roles for Service Accounts)
- scikit-learn model serving (sklearnserver)
- Alibi explainability framework
- KServe v1beta1 InferenceService CRD

## Sources Consulted
- KServe v0.12 archived documentation: https://kserve.github.io/archive/0.12/
- KServe GitHub release v0.12.0: https://github.com/kserve/kserve/releases/tag/v0.12.0
- KServe v1beta1 API source on `release-0.12` branch (`pkg/apis/serving/v1beta1/`), specifically `explainer_alibi.go` for valid Alibi explainer types
- Official KServe canary rollout sample (`docs/samples/v1beta1/rollout/canary.yaml`)
- KServe S3 storage credentials documentation (annotation format for `serving.kserve.io/s3-*`)
- KServe controller manifest on release-0.12 (`config/manager/manager.yaml`) for the `control-plane=kserve-controller-manager` label
- KServe "First InferenceService" guide for V1 prediction protocol path

## Issues Found

1. **Step 4: Invalid `predictor.canary` field** — The original YAML used a `canary:` subfield under `predictor:` (`predictor.canary.sklearn.storageUri`). This field does not exist in the KServe v1beta1 InferenceService spec. The original YAML also mixed an invalid `containers:` entry alongside a framework-specific `sklearn:` predictor, which is contradictory.
   - **Fix:** Replaced with the correct canary pattern: a single `predictor` spec containing `canaryTrafficPercent` and the new `sklearn.storageUri`. Added a one-line note explaining that KServe retains the previous revision as default and routes the specified percentage to the new revision when the InferenceService is updated.

2. **Step 6: Misleading "SHAP explainer" comment** — The comment said "Add SHAP explainer to InferenceService" but the type used is `AnchorTabular`, which is an anchor-based Alibi explainer, not SHAP. KServe v0.12's `AlibiExplainerType` enum values are `AnchorTabular`, `AnchorImages`, `AnchorText`, `Counterfactuals`, and `Contrastive` — SHAP is not among them.
   - **Fix:** Changed the comment to "Add Alibi explainer to InferenceService".

## Review Notes

- The Step 2 example mixes two authentication methods: it sets the EKS IRSA annotation (`eks.amazonaws.com/role-arn`) on the ServiceAccount AND provides static `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in a Secret. In practice, you would typically choose one approach. This is a stylistic/clarity concern rather than a technical error, so it was left as-is.
- The example ServiceAccount does not explicitly reference the Secret via `secrets:` — KServe will discover the secret via the `serviceAccountName` set on the predictor as long as the Secret is mounted/referenced. Working as documented for IRSA-based flows.
- KServe v0.12 was released in April 2024. Newer KServe versions (v0.13+) prefer the generic `model:` predictor with `modelFormat:` over the framework-specific (`sklearn:`, `tensorflow:`) shorthand, but the framework shorthand remains valid in v0.12.
- The post assumes Knative Serving installation (serverless mode). KServe also supports a "RawDeployment" mode without Knative since v0.10, but that is out of scope for this guide.
- The V1 prediction protocol (`/v1/models/<name>:predict`) is correct for v0.12. A future revision could mention V2 protocol (`/v2/models/<name>/infer`) for OpenAPI-style inference.

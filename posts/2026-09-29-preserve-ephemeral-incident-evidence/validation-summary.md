# Validation Summary: How to Preserve Incident Evidence Before Pods, Instances, and Logs Disappear

## Status
validated

## Post Type
Technical guide with a Bash evidence-collection example.

## Technologies Covered
- Kubernetes Pods, container lifecycle, events, and log rotation
- kubectl
- Bash and Unix file permissions, temporary directories, and UTC timestamps
- Amazon EC2 and EC2 Auto Scaling lifecycle hooks
- Log and trace exports, metrics, and evidence retention
- SHA-256 integrity verification

## Sources Consulted
- Kubernetes logging architecture and rotation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Official kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Official kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Pod lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes core API type definitions: https://github.com/kubernetes/api/blob/master/core/v1/types.go
- AWS Auto Scaling lifecycle hooks: https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html
- AWS instance retention policies: https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-lifecycle-policy.html
- EC2 instance identity and launch metadata fields: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_Instance.html
- CloudWatch Logs export pagination, timestamps, and limits: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_GetLogEvents.html
- NIST Secure Hash Standard (FIPS 180-4): https://csrc.nist.gov/pubs/fips/180-4/upd1/final
- Local Bash and mktemp manual pages (`man bash`, `man mktemp`). GNU manual web pages were unavailable through the browser during review.
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The AWS paragraph described termination after hook expiry or abandonment without qualification. Current AWS documentation supports retention when an instance lifecycle policy handles `TerminateHookAbandon`. Qualified termination as the default behavior and added the retention-policy exception. The existing lifecycle-hooks citation documents this distinction.

## Review Notes
- Extracted the Bash example and checked it with `/bin/bash -n`; syntax validation passed. No production Kubernetes or AWS requests were executed, so this is documentation and syntax validation rather than a live infrastructure test.
- Checked all kubectl flags, JSON output, namespace scoping, explicit context selection, previous-container selection, relative time filtering, timestamps, and the 10 MiB limit. No deprecated flags were identified.
- Confirmed the documented limits of previous-container logs and rotated logs. Successful requests do not establish that the requested historical evidence remains available.
- Pod identity comparisons and container restart checks appropriately acknowledge collection races. Status snapshots are observations, not an atomic guarantee of log provenance.
- The script assumes ordinary Bash execution without inherited errexit behavior. Its unguarded object requests can stop execution if a caller explicitly enables `set -e`; run it as the standalone example rather than incorporating it unchanged into a strict-mode wrapper.
- Request timeouts apply to individual server requests, not a guaranteed total script deadline. The article does not promise a total deadline.
- The manifest is a template for follow-up recordkeeping; the script does not automate per-artifact manifests, uploads, hashing, or retrieval verification.
- A trusted hash comparison supports byte-integrity checking, not completeness or authenticity of the original source. The post correctly makes that distinction.
- External article references resolve to the intended official resources. No explicit product version is claimed; behavior was checked against the documentation available during review.

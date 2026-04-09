# Validation Summary: How to Set Up IBM Key Protect with Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IBM Key Protect (cloud-based KMS)
- Rook-Ceph (Kubernetes storage orchestrator)
- ceph-csi (CSI driver for Ceph)
- IBM Cloud CLI (`ibmcloud` and `kp` plugin)
- Kubernetes (Secrets, ConfigMaps, StorageClasses)
- LUKS/dm-crypt encryption for RBD volumes

## Sources Consulted
- Rook source code (`rook/rook` GitHub repository) - `pkg/daemon/ceph/osd/kms/ibm_key_protect.go`, `Documentation/Storage-Configuration/Advanced/key-management-system.md`
- ceph-csi source code (`ceph/ceph-csi` GitHub repository) - `internal/kms/keyprotect.go`, `examples/kms/vault/kms-config.yaml`, `examples/kms/vault/csi-kms-connection-details.yaml`, `examples/kms/vault/kp-credentials.yaml`
- IBM `keyprotect-go-client` library vendored in ceph-csi - `kp.go` (DefaultBaseURL), `iam/iam.go` (IAMTokenURL)
- IBM Cloud CLI documentation for `ibmcloud resource` and `ibmcloud kp` commands
- IBM Key Protect official documentation (`github.com/ibm-cloud-docs/key-protect`) for FIPS certification level
- Rook release history and PR #9545 (IBM Key Protect support) and PR #9573 (backport to v1.8)

## Issues Found

1. **Rook version requirement was wrong (line 20):** Blog stated "Rook-Ceph 1.10 or later." IBM Key Protect support was added in Rook v1.8.3 (backport) and v1.9.0 (mainline), not v1.10. Fixed to "Rook-Ceph 1.9 or later" with a note about v1.8.3 backport.

2. **jq path for credential extraction was wrong (line 30):** `ibmcloud resource service-key ... --output json` returns a JSON array, not a single object. Changed `.credentials` to `.[0].credentials`.

3. **Kubernetes Secrets structure was completely wrong (Step 3):** The blog created two secrets (`ibm-kp-credentials` and `ibm-kp-api-key`) with fabricated key names (`IBM_KP_BASE64_CONFIG`, `IBM_KP_SECRET_NAME` in secret). The ceph-csi source strictly validates secret keys and only allows: `IBM_KP_SERVICE_API_KEY`, `IBM_KP_CUSTOMER_ROOT_KEY`, `IBM_KP_SESSION_TOKEN` (optional), and `IBM_KP_CRK_ARN` (optional). Any other key causes an error. Fixed to a single secret named `ceph-csi-kp-credentials` with the correct keys `IBM_KP_SERVICE_API_KEY` and `IBM_KP_CUSTOMER_ROOT_KEY`.

4. **ConfigMap contained secret data and was missing a required key (Step 4):** `IBM_KP_CUSTOMER_ROOT_KEY` was placed in the ConfigMap (non-secret, readable by anyone with ConfigMap access) instead of in the Kubernetes Secret where it belongs. Additionally, `IBM_KP_SECRET_NAME` was missing from the ConfigMap — this key tells ceph-csi which Secret to read for credentials. Fixed by removing `IBM_KP_CUSTOMER_ROOT_KEY` from ConfigMap and adding `IBM_KP_SECRET_NAME: "ceph-csi-kp-credentials"`.

5. **IBM IAM token URL was wrong (Step 4):** Blog used `https://iam.cloud.ibm.com/identity/token` but the correct URL used by the `keyprotect-go-client` library is `https://iam.cloud.ibm.com/oidc/token`. Confirmed in both the ceph-csi vendored library and Rook documentation. Fixed to `/oidc/token`.

## Review Notes
- The `encryptionKMSType: "ibmkeyprotect"` value is correct and confirmed in both Rook and ceph-csi source code.
- The StorageClass provisioner `rook-ceph.rbd.csi.ceph.com` is correct for the default `rook-ceph` namespace.
- The IBM Key Protect FIPS 140-2 Level 3 claim is correct (Level 4 is IBM Hyper Protect Crypto Services, a different product).
- The IBM Cloud CLI commands for provisioning Key Protect (`ibmcloud resource service-instance-create ... kms tiered-pricing ...`) and creating root keys (`ibmcloud kp key create`) are syntactically correct.
- The `IBM_KP_BASE_URL` default of `https://us-south.kms.cloud.ibm.com` is correct per the `keyprotect-go-client` library.
- The envelope encryption description in the Summary section is accurate.

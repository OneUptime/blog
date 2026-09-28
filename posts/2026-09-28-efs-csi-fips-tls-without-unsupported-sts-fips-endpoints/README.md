# How to Enable FIPS-Compliant EFS CSI TLS Without Calling Unsupported Regional STS FIPS Endpoints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, EKS, Kubernetes, FIPS, Encryption

Description: Enable EFS CSI mount-side FIPS settings while keeping unsupported regional STS FIPS endpoints out of the control-plane credential path.

The EFS CSI Helm setting `useFIPS: true` affects more than the TLS connection carrying file data. It also directs AWS SDK calls toward FIPS endpoints. In a Region without the required endpoints, the controller can fail to obtain credentials or initialize its AWS clients before it ever provisions a volume.

Separate the requirement for FIPS cryptography on the EFS mount from the requirement for FIPS endpoints on every AWS API call. The configuration below addresses the former while using ordinary regional API endpoints. It does not establish that the entire cluster or application's control plane meets a particular compliance requirement.

## Identify which connection failed

Inspect the driver image, effective environment, and errors:

```bash
kubectl get deployment efs-csi-controller -n kube-system -o yaml
kubectl get daemonset efs-csi-node -n kube-system -o yaml
kubectl logs -n kube-system deployment/efs-csi-controller \
  -c efs-plugin --since=15m
```

An error naming an unsupported STS FIPS endpoint is a control-plane issue. An NFS timeout to port 2049 is a mount-path issue. A missing directory or denied write after mounting is an authorization or POSIX issue. Keep these failure classes separate while changing settings.

The released driver's FIPS documentation explains that `useFIPS` sets `AWS_USE_FIPS_ENDPOINT`, and that newer releases reject that setting at startup in unsupported Regions. Check the required STS and EC2 endpoints against the actual Region. [Driver FIPS behavior](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/fips.md), [AWS FIPS endpoint list](https://aws.amazon.com/compliance/fips/).

Do not downgrade to an old driver just because it appears to ignore the endpoint problem. Earlier SDK behavior can mean the desired endpoint setting was never being honored.

## Choose the supported configuration boundary

If your requirement includes FIPS endpoints for all control-plane services, use a Region and service combination providing those endpoints. Switching to ordinary endpoints does not satisfy that requirement.

If the requirement is specifically FIPS mode for the EFS mount's cryptography, the driver documents a separate `FIPS_ENABLED` setting. The following values target Helm chart 4.5.0 with driver v3.5.0:

```yaml
useFIPS: false
node:
  env:
    - name: FIPS_ENABLED
      value: "true"
```

`useFIPS: false` prevents the chart from adding `AWS_USE_FIPS_ENDPOINT=true`. `FIPS_ENABLED=true` tells the driver's mount-helper configuration to enable FIPS mode. The quoted string is deliberate: Kubernetes environment-variable values are strings. [Documented mount-only FIPS configuration](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/faq.md#invalid-sts-fips-regional-endpoint-workaround-for-non-us-and-canada-regions).

Merge the environment entry with existing values rather than overwriting unrelated node environment settings. Also remove any explicitly configured `AWS_USE_FIPS_ENDPOINT=true` in controller or node environment overrides. An inherited setting can survive a change to the top-level Helm value.

If the controller performs EFS mounts for access-point directory cleanup, give its environment the same `FIPS_ENABLED: "true"` setting. The normal provisioner API calls and the cleanup mount have different purposes, but the cleanup data path still needs the intended TLS configuration.

## Verify the rendered resources before rollout

Render the installation with its existing values plus the reviewed change:

```bash
helm template aws-efs-csi-driver \
  aws-efs-csi-driver/aws-efs-csi-driver \
  --version 4.5.0 \
  --namespace kube-system \
  -f reviewed-values.yaml > rendered-efs-driver.yaml
```

Confirm that the node `efs-plugin` has `FIPS_ENABLED=true`, neither plugin has a conflicting FIPS-endpoint setting, and the image is the release you evaluated. For an EKS-managed add-on, inspect its version-specific configuration schema and apply changes through the add-on manager; Helm values are not automatically its API schema.

Roll out through a canary node group or a controlled maintenance procedure. New pod specifications alone are insufficient evidence about already running TLS processes or existing mounts.

## Check the mount helper and the crypto implementation

On a restarted node plugin, inspect the generated configuration:

```bash
kubectl exec -n kube-system efs-csi-node-example -c efs-plugin -- \
  cat /etc/amazon/efs/efs-utils.conf
```

Check the `[mount]` setting `fips_mode_enabled = true`, then create a fresh canary mount with TLS and inspect mount-helper logs for successful startup. The driver generates this configuration from `FIPS_ENABLED`. [Configuration implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/efs_watch_dog.go).

A configuration flag is only part of the evidence. Validate the image's cryptographic module and deployment requirements against your required standard. The driver documentation distinguishes the AWS-LC-FIPS-based releases from older OpenSSL-based images; substituting a custom image can change those assumptions.

Finally, verify that a PVC provisions, its pod mounts, and a read/write test succeeds. Confirm API calls follow the intended endpoint path separately from confirming mount TLS behavior. Record the driver image digest, Region, effective configuration, and fresh-mount evidence so a future image or Region change can be evaluated against the same requirement.

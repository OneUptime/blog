# Validation Summary: How to Set Up Istio on Huawei Cloud Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Huawei Cloud Container Engine (CCE)
- Huawei Cloud Elastic Load Balance (ELB)
- Kubernetes
- kubectl
- istioctl
- Docker
- Huawei Cloud SWR
- Huawei Cloud AOM and ICAgent

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio release download documentation: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio in-place upgrade documentation: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio supported releases and support announcements: https://istio.io/latest/docs/releases/supported-releases/ and https://istio.io/latest/news/support/
- IstioOperator customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Huawei Cloud CCE LoadBalancer Service documentation: https://support.huaweicloud.com/intl/en-us/usermanual-cce/cce_10_0681.html
- Huawei Cloud CCE CreateCluster API documentation: https://support.huaweicloud.com/api-cce/cce_02_0236.html
- Huawei Cloud CCE Cloud Native Network 2.0 documentation: https://support.huaweicloud.com/intl/en-us/usermanual-cce/cce_10_0678.html
- Huawei Cloud CCE Kubernetes version policy: https://support.huaweicloud.com/intl/en-us/bulletin-cce/cce_bulletin_0033.html
- Huawei Cloud KooCLI documentation: https://support.huaweicloud.com/intl/en-us/usermanual-hcli/hcli_08_001.html

## Issues Found
- The Istio install command downloaded the latest Istio release but then changed into a hard-coded `istio-1.24.0` directory. Istio 1.24 is no longer supported, and the command would fail whenever the downloaded latest version differed. Updated the install command to explicitly download and enter Istio `1.29.2`.
- The Huawei CCE cluster creation API example omitted the `spec.category` field used by the official CCE CreateCluster examples. Added `"category": "CCE"` to make the request body match the documented API shape.
- The SWR mirror example configured Istio to use a custom hub but only mirrored `proxyv2`. The default Istio installation also needs the control plane image. Added `pilot` pull, tag, and push commands and updated the image tag to `1.29.2`.
- The upgrade example used `istioctl upgrade -y` even though the installation used an IstioOperator file with Huawei ELB annotations. Istio documentation says upgrades must pass the same `-f` file used at install time. Updated the command to `istioctl upgrade -f istio-cce.yaml -y`.
- The upgrade example used fixed outdated versions. Replaced the hard-coded old version with a shell variable so the commands remain syntactically valid and easier to update to a supported target release.
- The CCE API example used Kubernetes `v1.30`, which is not in the official supported Kubernetes range for Istio `1.29`. Updated the sample cluster version to `v1.31`.

## Review Notes
The Huawei ELB annotations shown in the IstioOperator `serviceAnnotations` block align with CCE LoadBalancer Service documentation for shared and dedicated load balancer selection. Istio `1.29.2` is current in the consulted official Istio documentation, and the sample CCE `v1.31` cluster is within the Kubernetes version range supported by Istio `1.29`.

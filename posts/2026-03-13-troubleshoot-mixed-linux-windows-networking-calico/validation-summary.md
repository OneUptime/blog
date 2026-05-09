# Validation Summary: How to Troubleshoot Mixed Linux and Windows Networking with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico for Windows
- Kubernetes
- Linux and Windows Kubernetes worker nodes
- VXLAN
- BGP
- Calico IPPool and Installation resources
- kubectl

## Sources Consulted
- Calico for Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico for Windows Operator install guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico Kubernetes system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes Windows documentation: https://kubernetes.io/docs/concepts/windows/
- Project Calico v3.27.0 GitHub release: https://github.com/projectcalico/calico/releases/tag/v3.27.0

## Issues Found
- The post stated or implied that VXLAN mode is required for Windows. Calico documentation says Windows supports Calico CNI with either VXLAN or non-overlay BGP, while IP-in-IP is the unsupported mode. Updated the prerequisites, VXLAN section, and conclusion to reflect that VXLAN is required only for overlay deployments.
- The introduction said Calico for Windows provides the same network policy capabilities available for Linux pods. Calico documents Windows-specific security and dataplane limitations, so the wording was narrowed to Calico policy support with Windows-specific limitations.
- The prerequisites listed "Windows Server 2019+" and "Calico v3.12+ with Windows support". Current Calico documentation specifies supported Windows builds by Kubernetes version and notes Calico v3.27+ for Operator installs. Updated the prerequisites accordingly.
- The Windows installation snippet used a manual ZIP-based install flow. Current Calico documentation marks manual Windows installation as deprecated in favor of Operator and HostProcess containers. Replaced the snippet with Operator-based commands for strict affinity, enabling the Windows HNS dataplane, and monitoring the Windows Calico pods.
- The tag list used "Window" instead of "Windows". Corrected the tag.

## Review Notes
The GitHub release URL for `calico-windows-v3.27.0.zip` is still valid, but the post now avoids recommending the deprecated manual installation path. The `windows-pod.yaml` example assumes the referenced manifest schedules a Windows container onto Windows nodes, typically with an OS selector and a compatible Windows container image.

# Testing Cilium Roadmap Features

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Roadmap, Testing, Staging, Kubernetes

Description: Test and validate upcoming Cilium features from the roadmap in staging environments to prepare for adoption.

---

## Introduction

Continuous improvement of community processes requires regular evaluation and testing. Validating that the Cilium project roadmap meet community needs ensures the Cilium project maintains high standards of collaboration and communication.

Testing community processes involves checking accessibility, effectiveness, and alignment with project goals. It is a form of quality assurance for the human side of open source.

This guide covers approaches to testing and validating the Cilium project roadmap.

## Prerequisites

- Familiarity with the Cilium project and its ecosystem
- A GitHub account for participating in project discussions
- Understanding of Cilium architecture and features

## Testing Roadmap Features

### Setting Up a Test Environment

```bash
# Create a test cluster for upcoming features
kind create cluster --name cilium-roadmap-test --config - << 'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraMounts:
  - hostPath: /opt/images
    containerPath: /opt/images
- role: worker
- role: worker
networking:
  disableDefaultCNI: true
EOF

# Install Cilium development build
cilium install --version=v1.17.0-rc.1 --set debug.enabled=true
```

### Testing Pre-Release Features

```bash
# Install a specific pre-release version
helm repo update
helm search repo cilium/cilium --versions --devel | head -10

# Install with feature flags enabled
helm install cilium cilium/cilium \
  --version 1.17.0-rc.1 \
  --namespace kube-system \
  --set debug.enabled=true
```

### Providing Feedback on Roadmap Features

When testing pre-release features:
1. Document your test environment and configuration
2. Note any deviations from documented behavior
3. Report bugs with detailed reproduction steps
4. Share performance observations
5. Suggest documentation improvements

### Regression Testing

```bash
# Run Cilium connectivity tests
cilium connectivity test

# Verify basic functionality
kubectl create deployment test --image=nginx
kubectl expose deployment test --port=80
kubectl run curl --image=curlimages/curl --rm -it -- curl http://test
```

## Verification

Verify roadmap information is accessible and up to date.

## Troubleshooting

- **Cannot find meeting links**: Check the Cilium community calendar and #community Slack channel.
- **Slack workspace access**: Request an invite through the Cilium website.
- **GitHub permissions**: Ensure your account has the necessary access for the repositories you need.
- **Timezone confusion**: All official times are in UTC. Use a timezone converter for your local time.

## Conclusion

The project roadmap provides a framework for evaluating understanding project direction. Regular evaluation ensures these processes continue to serve the community effectively.

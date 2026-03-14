# Extending the Cilium API Reference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, API, Documentation, Contributing, Open Source

Description: Contribute to and extend the Cilium API reference documentation with new endpoints, examples, and improved descriptions.

---

## Introduction

Open source projects thrive when community members contribute to improving processes and resources. Extending Cilium API reference documentation helps the entire Cilium community by making information more accessible and processes more efficient.

Contributing to api reference does not require deep technical expertise -- clear communication, attention to detail, and understanding of community needs are equally valuable.

This guide covers how to contribute to and extend Cilium API reference documentation.

## Prerequisites

- Familiarity with the Cilium project and its ecosystem
- kubectl access to a Cilium cluster
- Understanding of Cilium architecture and features

## Contributing to API Documentation

### Finding Documentation Gaps

```bash
# Clone the Cilium repository
git clone https://github.com/cilium/cilium.git
cd cilium

# Find API definition files
find . -name "*.go" -path "*/api/*" | head -20

# Look for OpenAPI/Swagger definitions
find . -name "*.yaml" -o -name "*.json" | xargs grep -l "swagger\|openapi" 2>/dev/null
```

### Adding API Examples

When extending the API reference, include practical examples:

1. **Request format**: Show the complete HTTP request with headers
2. **Response format**: Show the full JSON response with descriptions
3. **Error responses**: Document common error codes and their meaning
4. **Usage context**: Explain when and why to use the endpoint

### Submitting Documentation PRs

```bash
# Create a branch for your documentation changes
git checkout -b docs/api-reference-improvements

# Edit documentation files
# Usually in docs/ or api/ directories

# Build docs locally to verify
make -C Documentation html

# Commit and push
git add .
git commit -m "docs: improve API reference for endpoint operations"
git push origin docs/api-reference-improvements
```

Follow the Cilium contributing guide for PR requirements and review process.

## Verification

Confirm you can access the API endpoints and receive valid JSON responses.

## Troubleshooting

- **Cannot find meeting links**: Check the Cilium community calendar and #community Slack channel.
- **Slack workspace access**: Request an invite through the Cilium website.
- **GitHub permissions**: Ensure your account has the necessary access for the repositories you need.
- **Timezone confusion**: All official times are in UTC. Use a timezone converter for your local time.

## Conclusion

The Cilium API reference is an essential resource for understanding and interacting with the Cilium agent programmatically. provides opportunities to working with Cilium programmatically. Active participation strengthens both your own Cilium practice and the broader community.

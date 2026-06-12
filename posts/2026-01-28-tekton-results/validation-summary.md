# Validation Summary: How to Configure Tekton Results

## Status
validated

## Post Type
Guide

## Technologies Covered
- Tekton Results
- Tekton Pipelines
- Kubernetes
- CI/CD observability

## Sources Consulted
- Tekton Results overview: https://tekton.dev/docs/results/
- Tekton Results API documentation: https://tekton.dev/docs/results/api/
- Tekton Results Watcher documentation: https://tekton.dev/docs/results/watcher/
- Tekton Operator TektonResult documentation: https://tekton.dev/docs/operator/tektonresult/

## Issues Found
- The post said to add results configuration to Tekton Pipelines so TaskRuns and PipelineRuns are stored in the Results backend. Official Tekton documentation describes the Results Watcher as the controller that watches TaskRun and PipelineRun changes and creates or updates their data in the Results API. I changed the wording to instruct readers to ensure the Results Watcher is running.

## Review Notes
The post is a high-level guide and does not include commands, manifests, or concrete configuration fields to validate. The remaining claims are consistent with the official Tekton Results overview, API, Watcher, and Operator documentation: Results provides persistent storage for Tekton CI/CD history, supports querying through the Results API, can store logs, and can be installed or managed through Tekton Operator resources.

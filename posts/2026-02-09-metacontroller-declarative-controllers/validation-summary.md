# Validation Summary: How to Use Metacontroller for Declarative Custom Controllers Without Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Metacontroller
- CompositeController
- DecoratorController
- CustomResourceDefinition
- Python Flask
- Node.js Express
- Docker

## Sources Consulted
- Metacontroller installation guide: https://metacontroller.github.io/metacontroller/guide/install.html
- Metacontroller CompositeController API reference: https://metacontroller.github.io/metacontroller/api/compositecontroller.html
- Metacontroller DecoratorController API reference: https://metacontroller.github.io/metacontroller/api/decoratorcontroller.html
- Metacontroller Hook API reference: https://metacontroller.github.io/metacontroller/api/hook.html
- Metacontroller Customize Hook API reference: https://metacontroller.github.io/metacontroller/api/customize.html
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/

## Issues Found
- The post described three Metacontroller controller patterns and listed `CustomController`, but the current Metacontroller API reference documents CompositeController and DecoratorController as the main controller APIs. Removed the inaccurate `CustomController` entry and changed the wording to two main controller patterns.
- The CompositeController examples used a custom parent resource with no `spec.selector`. Metacontroller expects a parent selector unless selector generation is enabled. Added `generateSelector: true` to the CompositeController examples.
- The Python and Node.js sync responses returned `children` as an associative map keyed by resource name. Metacontroller sync responses require a flat list of desired child objects. Updated both examples to return flat child lists.
- The Python and Node.js status code read existing children with keys such as `deployments.apps/v1`. Metacontroller request maps use `<Kind>.<apiVersion>`, such as `Deployment.apps/v1`. Updated the examples accordingly.
- The Node.js example referenced `createService()` and `computeStatus()` without defining them. Added minimal implementations consistent with the Python example.
- The Dockerfile used `python:3.9-slim`, which pins the example to an old Python series. Changed it to `python:3-slim`.
- The Customize Hook section incorrectly said the hook modifies resources before they are applied. Updated the wording to explain that it selects related resources for sync and finalize requests, and added a sync hook to the snippet so the controller has reconciliation behavior.
- The Customize Hook snippet used status checks with `InPlace`, while Metacontroller documents status checks for rolling update methods. Changed the method to `RollingInPlace`.

## Review Notes
The examples remain simplified and omit operational details such as RBAC for the webhook controller, image build and push commands, and concrete `requirements.txt` / `package.json` files. Those omissions are acceptable for the scope of the tutorial but would be useful in a production walkthrough.

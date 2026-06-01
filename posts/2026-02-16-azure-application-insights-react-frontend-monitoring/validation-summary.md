# Validation Summary: How to Integrate Azure Application Insights with a React Frontend for Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Application Insights
- Azure CLI
- Azure Monitor
- React
- TypeScript
- Vite
- Application Insights JavaScript SDK
- Application Insights React plugin
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Learn: Azure CLI `az monitor app-insights component` reference, https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component?view=azure-cli-latest
- Microsoft Learn: Create and configure Application Insights resources, https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource
- Microsoft Learn: Application Insights JavaScript SDK configuration, https://learn.microsoft.com/en-gb/azure/azure-monitor/app/javascript-sdk-configuration
- Microsoft Learn: Application Insights JavaScript SDK framework extensions for React, https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript-framework-extensions
- Microsoft ApplicationInsights-JS API reference, https://microsoft.github.io/ApplicationInsights-JS/API-reference
- Microsoft Application Insights React plugin repository, https://github.com/microsoft/applicationinsights-react-js
- React official blog: Sunsetting Create React App, https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- Vite Getting Started documentation, https://vite.dev/guide/
- Vite Env Variables and Modes documentation, https://vite.dev/guide/env-and-mode.html
- Local package type declarations from `@microsoft/applicationinsights-web@3.4.1`, `@microsoft/applicationinsights-core-js@3.4.1`, and `@microsoft/applicationinsights-react-js@19.4.0`

## Issues Found
- The setup used `create-react-app`, which React officially deprecated for new apps in February 2025. Replaced the scaffolding command with `npm create vite@latest react-insights-demo -- --template react-ts` and added the required `npm install` step.
- The prerequisite said Node.js 18 or later. Current Vite requires Node.js 20.19+ or 22.12+, so the prerequisite was updated.
- The telemetry configuration used Create React App environment variable conventions: `process.env.REACT_APP_APPINSIGHTS_CONNECTION_STRING` and `process.env.NODE_ENV`. Updated these to Vite's `import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING` and `import.meta.env.DEV`.
- The entry point comment referenced `src/index.tsx`, which matches Create React App rather than the Vite React TypeScript template. Updated it to `src/main.tsx`.
- The `.env` example used the Create React App `REACT_APP_` prefix. Updated it to Vite's required `VITE_` prefix.
- The error boundary imported `ErrorInfo` as a runtime import. The current Vite TypeScript template enables `verbatimModuleSyntax`, so `ErrorInfo` must be imported with `type`; the snippet was updated to `import React, { Component, type ErrorInfo } from 'react';`.
- The wrapping-up section claimed the SDK adds about 30KB gzipped. Current package bundle impact varies by build and imported SDK features, and the checked SDK browser bundles are larger than that claim, so the wording was made conditional instead of giving a fixed size.

## Review Notes
Verified the corrected snippets by creating a temporary Vite React TypeScript project, installing `@microsoft/applicationinsights-web` and `@microsoft/applicationinsights-react-js`, adding the post's TypeScript snippets, and running `npm run build` successfully.

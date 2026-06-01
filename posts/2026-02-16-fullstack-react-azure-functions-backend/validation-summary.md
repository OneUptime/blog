# Validation Summary: How to Build a Full-Stack Application with React Frontend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- TypeScript
- Vite
- Azure Functions
- Azure Functions Core Tools
- Azure CLI
- Node.js
- Azure Storage
- Azure Static Web Apps / Azure Blob Storage with CDN

## Sources Consulted
- Azure Functions TypeScript command-line quickstart: https://learn.microsoft.com/en-us/azure/azure-functions/how-to-create-function-azure-cli?pivots=programming-language-typescript
- Azure Functions runtime version support: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions
- Azure Functions Node.js v4 programming model migration guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4
- Azure Functions HTTP trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Azure CLI `az functionapp create` reference: https://learn.microsoft.com/en-us/cli/azure/functionapp?view=azure-cli-latest
- Vite guide and React TypeScript template list: https://vite.dev/guide/
- Vite dev server proxy documentation: https://vite.dev/config/server-options.html#server-proxy
- React `useState` reference: https://react.dev/reference/react/useState
- React `useEffect` reference: https://react.dev/reference/react/useEffect
- React TypeScript documentation: https://react.dev/learn/typescript

## Issues Found
- The prerequisites and Azure Function App creation command used Node.js 18. Azure Functions no longer lists Node.js 18 as a supported runtime as of the 2026-06-01 review date; updated the post to use Node.js 22.
- The Azure Functions project initialization command used `func init --typescript`. Updated it to the officially documented `func init --worker-runtime node --language typescript`.
- The React `App.tsx` example referenced `React.FormEvent` without importing the `React` namespace. Updated the import to include `type FormEvent` and typed the submit handler as `FormEvent<HTMLFormElement>`.
- The API validation accepted non-numeric amount values such as `"abc"` and could store `NaN`. Updated the backend example to convert with `Number(...)` and reject non-finite or non-positive values before saving.
- The Azure deployment snippet assumed the resource group and storage account already existed. Added minimal `az group create` and `az storage account create` commands before creating the Function App.
- The Azure deployment snippet used `cd api && ...` followed by `cd client && ...` in the same command block, which would fail if copied as a single shell session because the working directory would remain `api`. Wrapped those commands in subshells.
- The project structure labeled the root `package.json` as containing scripts, but the guide does not add any root scripts. Updated the label to avoid implying a missing setup step.

## Review Notes
The in-memory expense store is technically valid for a tutorial but remains unsuitable for production, as the post already notes. The deployment section still intentionally leaves the frontend publishing mechanism at a high level because the original post presents Azure Static Web Apps or Blob Storage with CDN as alternatives rather than walking through one complete frontend deployment path.

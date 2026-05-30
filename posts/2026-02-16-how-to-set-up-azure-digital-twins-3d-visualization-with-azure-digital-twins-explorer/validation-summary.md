# Validation Summary: How to Set Up Azure Digital Twins 3D Visualization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Digital Twins
- Azure Digital Twins Explorer
- 3D Scenes Studio
- Digital Twins Definition Language (DTDL)
- Azure CLI and the azure-iot extension
- Azure Storage blobs and CORS
- IoT Hub telemetry ingestion
- Azure Functions for Python
- Azure Digital Twins Python SDK

## Sources Consulted
- Azure Digital Twins CLI command set: https://learn.microsoft.com/en-us/azure/digital-twins/concepts-cli
- Azure CLI `az dt` reference: https://learn.microsoft.com/en-us/cli/azure/dt
- Set up an Azure Digital Twins instance and authentication with CLI: https://learn.microsoft.com/en-us/azure/digital-twins/how-to-set-up-instance-cli
- Query the Azure Digital Twins graph: https://learn.microsoft.com/en-us/azure/digital-twins/how-to-query-graph
- 3D Scenes Studio concepts: https://learn.microsoft.com/en-us/azure/digital-twins/concepts-3d-scenes-studio
- Build 3D scenes with 3D Scenes Studio: https://learn.microsoft.com/en-us/azure/digital-twins/how-to-use-3d-scenes-studio
- Azure Digital Twins Core client library for Python: https://learn.microsoft.com/en-us/python/api/overview/azure/digitaltwins-core-readme
- Ingest IoT Hub telemetry into Azure Digital Twins: https://learn.microsoft.com/en-us/azure/digital-twins/how-to-ingest-iot-hub-data

## Issues Found
- The 3D Scenes Studio prerequisites omitted required Azure Storage data-plane permissions for building scenes. Added Storage Blob Data Contributor or Storage Blob Data Owner access to the prerequisites.
- The storage setup commands created and uploaded blobs without using Microsoft Entra authentication even though the tutorial grants RBAC roles. Added Storage Blob Data Contributor assignment and `--auth-mode login` to the storage container and blob upload commands.
- The CORS command did not match the current 3D Scenes Studio documentation. Replaced `GET HEAD OPTIONS` and wildcard headers with the documented `GET OPTIONS POST PUT` methods and required allowed headers.
- The 3D scene creation steps used outdated or imprecise UI wording. Updated them to describe configuring the Studio environment with the Azure Digital Twins instance URL, storage account URL, and container name, then using **Add 3D scene**.
- The Python telemetry sample was not syntactically complete because it used `json.loads` without importing `json`, and called an undefined `get_parent_room` function. Added the missing import and a simple lookup-backed helper matching the article's sample twins.

## Review Notes
The post remains a high-level setup guide. A production implementation should add the full Azure Functions trigger scaffolding, managed identity setup for the function app, and a durable device-to-twin mapping strategy.

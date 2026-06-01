# Validation Summary: How to Ingest and Query Medical Imaging Data Using the DICOM Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Health Data Services
- Azure Health Data Services DICOM service
- DICOM and DICOMweb
- STOW-RS, QIDO-RS, and WADO-RS
- Azure CLI
- Microsoft Entra ID authentication
- Azure RBAC
- Python
- dicomweb-client
- pydicom
- FHIR ImagingStudy

## Sources Consulted
- Microsoft Learn: Access DICOMweb APIs to manage DICOM data in Azure Health Data Services - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/dicomweb-standard-apis-with-dicom-services
- Microsoft Learn: Use DICOMweb Standard APIs with cURL - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/dicomweb-standard-apis-curl
- Microsoft Learn: DICOM Conformance Statement v2 - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/dicom-services-conformance-statement-v2
- Microsoft Learn: API versioning for DICOM service - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/api-versioning-dicom-service
- Microsoft Learn: az healthcareapis workspace dicom-service CLI reference - https://learn.microsoft.com/en-us/cli/azure/healthcareapis/workspace/dicom-service
- Microsoft Learn: Configure Azure RBAC for the DICOM service - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/dicom-configure-azure-rbac
- Microsoft Learn: DICOM extended query tags overview - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/dicom-extended-query-tags-overview
- dicomweb-client documentation - https://dicomweb-client.readthedocs.io/

## Issues Found
- The Azure CLI examples used `az healthcareapis dicom-service`, but the documented current command group is `az healthcareapis workspace dicom-service`. Updated the create and show commands.
- The prerequisites omitted `pydicom` and `azure-identity`, which are required by the Python example. Added both libraries.
- The Python upload sample imported an unused helper and passed raw bytes to `client.store_instances()`. The `dicomweb-client` API expects pydicom `Dataset` objects, so the sample now reads files with `pydicom.dcmread()` and stores those datasets.
- The study retrieval example wrote a multipart WADO-RS response to `study.dcm`, which implies a single DICOM file. Updated the Accept header to the documented form and changed the output filename to `study.multipart`.
- The single-instance retrieval example omitted the documented `transfer-syntax=*` media type parameter. Added it to the Accept header.
- The extended query tag creation body used lowercase property names. Updated it to the documented request schema with `Path`, `VR`, and `Level`.
- The post used the older Azure AD name. Updated the text to Microsoft Entra ID, with the former name noted once for clarity.

## Review Notes
The post uses DICOM API version `v1`, which remains listed as a supported Azure Health Data Services DICOM API version. Microsoft also documents `v2` as the latest API version, so a future refresh could consider whether to update all examples to `v2`.

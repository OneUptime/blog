# Validation Summary: How to Build a Medical Imaging Analysis Pipeline with Azure Health Data Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Health Data Services
- Azure DICOM service
- DICOMweb STOW-RS, WADO-RS, and QIDO-RS
- Azure Health Data Services change feed
- DICOM bulk import
- Azure Functions
- Azure Machine Learning online endpoints
- Azure FHIR service and FHIR R4 DiagnosticReport, Observation, and ImagingStudy
- Python, pydicom, requests, and Azure Identity
- C# Azure Functions
- AzCopy

## Sources Consulted
- Microsoft Learn: Deploy the DICOM service with Blob storage by using the Azure portal - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/deploy-dicom-services-in-azure
- Microsoft Learn: Access DICOMweb APIs to manage DICOM data in Azure Health Data Services - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/dicomweb-standard-apis-with-dicom-services
- Microsoft Learn: Use Python and DICOMweb Standard APIs in Azure Health Data Services - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/dicomweb-standard-apis-python
- Microsoft Learn: API versioning for DICOM service - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/api-versioning-dicom-service
- Microsoft Learn: Import DICOM files into the DICOM service - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/import-files
- Microsoft Learn: Change feed overview for the DICOM service - https://learn.microsoft.com/en-us/azure/healthcare-apis/dicom/change-feed-overview
- Microsoft Learn: Configure Azure RBAC roles for Azure Health Data Services - https://learn.microsoft.com/en-us/azure/healthcare-apis/configure-azure-rbac
- Microsoft Learn: Authentication and authorization for Azure Health Data Services - https://learn.microsoft.com/en-us/azure/healthcare-apis/authentication-authorization
- Microsoft Learn: AzCopy copy reference - https://learn.microsoft.com/en-us/azure/storage/common/storage-ref-azcopy-copy
- HL7 FHIR R4: DiagnosticReport - https://hl7.org/fhir/R4/diagnosticreport.html
- HL7 FHIR R4: ImagingStudy - https://hl7.org/fhir/R4/imagingstudy.html

## Issues Found
- The bulk import section incorrectly showed a DICOM `/v1/$import` HTTP request. Microsoft documentation describes DICOM bulk import as a preview feature that must be enabled and then driven by uploading DICOM files to the generated `import-container`. Replaced the curl example with an AzCopy upload example and added the required enablement steps.
- The change feed text described the service as emitting events. The official change feed is a polling API that records create, update, and delete events. Updated the wording to describe polling.
- The C# change feed sample used incorrect casing for `Action` and `State` values (`Create` and `Current`). The documented values are lowercase (`create` and `current`). Updated the sample and made it syntactically complete by adding missing imports, constructor injection for `HttpClient`, JSON deserialization, offset tracking, and placeholder types/methods.
- The WADO-RS retrieve call used `Accept: application/dicom`. Azure's DICOMweb Python documentation uses `application/dicom; transfer-syntax=*` for a single instance retrieve. Updated the header.
- The FHIR DiagnosticReport sample used `reference: ImagingStudy?identifier={study_uid}`. FHIR R4 `DiagnosticReport.imagingStudy` is a Reference to ImagingStudy, and DICOM Study Instance UIDs should be represented with `urn:dicom:uid` and `urn:oid:` when used as identifiers. Updated the sample to use `Reference.identifier`.
- Removed an unused Python import from the DICOM client example.

## Review Notes
- The DICOM examples use `/v1`, which is still a supported API version. Microsoft also supports `/v2`; future updates may want to discuss the v2 change feed time-range parameters for high-volume polling.
- The Azure ML endpoint payload and response shape remain model-specific, so the sample is valid as an illustrative endpoint call but not a universal schema for all Azure ML deployments.
- The FHIR finding codes use an example code system. Production implementations should replace this with a governed local or standard terminology.

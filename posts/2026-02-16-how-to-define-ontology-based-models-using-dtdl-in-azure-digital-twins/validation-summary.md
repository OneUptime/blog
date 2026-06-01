# Validation Summary: How to Define Ontology-Based Models Using DTDL in Azure Digital Twins

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Digital Twins
- Digital Twins Definition Language (DTDL) v2
- DTDL-based industry ontologies
- RealEstateCore ontology
- Azure CLI `az dt model`
- Azure Digital Twins Python SDK
- Python
- JSON-LD

## Sources Consulted
- Azure Digital Twins models documentation: https://learn.microsoft.com/en-us/azure/digital-twins/concepts-models
- Manage Azure Digital Twins models: https://learn.microsoft.com/en-us/azure/digital-twins/how-to-manage-model
- Azure CLI `az dt model` reference: https://learn.microsoft.com/en-us/cli/azure/dt/model
- Azure Digital Twins Python SDK `DigitalTwinsClient.create_models`: https://learn.microsoft.com/en-us/python/api/azure-digitaltwins-core/azure.digitaltwins.core.digitaltwinsclient
- DTDL v2 language specification: https://azure.github.io/opendigitaltwins-dtdl/DTDL/v2/DTDL.v2.html
- Adopting DTDL-based industry ontologies: https://learn.microsoft.com/en-us/azure/digital-twins/concepts-ontologies-adopt
- Extending DTDL-based industry ontologies: https://learn.microsoft.com/en-us/azure/digital-twins/concepts-ontologies-extend
- RealEstateCore DTDL ontology repository: https://github.com/Azure/opendigitaltwins-building

## Issues Found
- The post described DTDL commands as part of Azure Digital Twins model contents. Azure Digital Twins does not support DTDL commands, so the introduction and fundamentals list were updated to focus on Azure Digital Twins-compatible contents and to call out that commands are not supported.
- The DTDL fundamentals list omitted components. Components are valid DTDL model contents and are supported by Azure Digital Twins with service-specific nesting limits, so the list was updated to include components.
- The HVAC model used the DTDL `writable` attribute. The attribute is valid DTDL, but Azure Digital Twins does not enforce it and treats properties as writable by clients with write permissions, so the example was changed to avoid implying Azure Digital Twins write enforcement.
- The CLI upload example used placeholder JSON fragments inside an inline JSON argument. The Azure CLI accepts a model file path or valid inline JSON, so the example was changed to point to a JSON file containing the model array.
- The upload guidance said models must always be uploaded in dependency order while also saying the service resolves dependencies. The wording was corrected: dependency order matters for separate uploads, while a dependent model set can be uploaded together as a JSON array.
- The Python example loaded model files with `glob`, which makes dependency order unclear. It now lists files explicitly in dependency order and removes the unused `glob` import.
- The RealEstateCore extension example used `dtmi:digitaltwins:rec_3_3:asset:Room;1`, which is not the documented room interface. It was changed to `dtmi:digitaltwins:rec_3_3:building:ConferenceRoom;1` for the smart conference room example.

## Review Notes
The post uses DTDL v2 (`dtmi:dtdl:context;2`), which Azure Digital Twins still supports. Current Azure Digital Twins documentation recommends DTDL v3 for expanded capabilities, but v2 remains technically valid for these examples.

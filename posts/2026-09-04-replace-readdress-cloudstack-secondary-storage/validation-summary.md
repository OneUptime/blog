# Validation Summary: How to Replace or Readdress CloudStack Secondary Storage Without Breaking Templates

## Status
validated

## Post Type
Technical operations guide with CloudMonkey commands and Linux NFS diagnostics.

## Technologies Covered
- Apache CloudStack 4.23 image stores and secondary storage
- CloudMonkey CLI and asynchronous CloudStack APIs
- Secondary Storage VMs (SSVMs)
- NFS, Linux storage utilities, and DNS resolution
- Templates, ISOs, uploaded volumes, snapshot chains, and recovery backups

## Sources Consulted
- Apache CloudStack storage administration: https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html#secondary-storage
- Apache CloudStack secondary-storage installation requirements: https://docs.cloudstack.apache.org/en/latest/installguide/configuration.html#add-secondary-storage
- Apache CloudStack system VM documentation: https://docs.cloudstack.apache.org/en/latest/adminguide/systemvm.html#secondary-storage-vm
- CloudStack 4.23 API index: https://cloudstack.apache.org/api/apidocs-4.23/
- Image-store APIs: https://cloudstack.apache.org/api/apidocs-4.23/apis/listImageStoreObjects.html, https://cloudstack.apache.org/api/apidocs-4.23/apis/addImageStore.html, https://cloudstack.apache.org/api/apidocs-4.23/apis/updateImageStore.html, https://cloudstack.apache.org/api/apidocs-4.23/apis/deleteImageStore.html
- Resource inventory APIs: https://cloudstack.apache.org/api/apidocs-4.23/apis/listTemplates.html, https://cloudstack.apache.org/api/apidocs-4.23/apis/listIsos.html, https://cloudstack.apache.org/api/apidocs-4.23/apis/listSnapshots.html, https://cloudstack.apache.org/api/apidocs-4.23/apis/listSystemVms.html
- Migration APIs: https://cloudstack.apache.org/api/apidocs-4.23/apis/migrateSecondaryStorageData.html, https://cloudstack.apache.org/api/apidocs-4.23/apis/migrateResourceToAnotherSecondaryStorage.html
- Async APIs: https://cloudstack.apache.org/api/apidocs-4.23/apis/listAsyncJobs.html, https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html
- Apache CloudMonkey usage documentation: https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage
- CloudStack 4.23 migration implementation, including source deletion after success: https://github.com/apache/cloudstack/blob/4.23.0.0/engine/storage/image/src/main/java/org/apache/cloudstack/storage/image/SecondaryStorageServiceImpl.java
- CloudStack migration orchestration and completion handling: https://github.com/apache/cloudstack/blob/4.23.0.0/engine/orchestration/src/main/java/org/apache/cloudstack/engine/orchestration/StorageOrchestrator.java
- Resource and snapshot-chain selection: https://github.com/apache/cloudstack/blob/4.23.0.0/engine/orchestration/src/main/java/org/apache/cloudstack/engine/orchestration/DataMigrationUtility.java
- Destination validation: https://github.com/apache/cloudstack/blob/4.23.0.0/server/src/main/java/com/cloud/storage/ImageStoreServiceImpl.java
- Red Hat Enterprise Linux 9 NFS server guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services
- NFS showmount manual: https://man7.org/linux/man-pages/man8/showmount.8.html
- Linux mount manual: https://man7.org/linux/man-pages/man8/mount.8.html

## Issues Found
1. **The old store was incorrectly promised as an unchanged rollback copy.** The 4.23 migration callback updates the destination and deletes the source datastore object after success. Replaced this promise with coordinated database/storage backups and recovery through supported reverse migration or backup restoration. Clarified that an incomplete migration leaves dependencies on both stores.
2. **Read-only was described as freezing the source inventory.** It controls allocation; it does not stop existing jobs or migration cleanup and is not an NFS read-only mount. Corrected this distinction and required existing jobs to settle before the final inventory.
3. **An address-only migration could be interpreted as registering an alias for the existing directory.** Required a separate empty backing directory, consistent with destination onboarding and source-cleanup behavior.
4. **The inventory did not establish a complete store-specific resource list.** Added image-store filters, explicit non-unique results, secondary snapshot location filtering, pagination, and separate project-resource queries. Clarified that the object browser lists a path rather than recursively enumerating the whole store. Added root-administrator context.
5. **Uploaded volumes and other tracked resources were absent from the retirement criteria.** Included uploaded volumes in the inventory and required every retained resource dependency to be accounted for before deleting the store.
6. **The registration test did not prove destination placement.** Registration can select another writable store. Required checking the new store explicitly and used the documented `isready` response field for templates and ISOs.
7. **The migration workflow conflated full-store migration with the Browser's selective workflow.** Specified the full migration API and its `srcpool`, `destpools`, and `migrationtype=Complete` parameters, while retaining the Browser/selective API workflow with its distinct `destpool` parameter.
8. **Async monitoring was limited to the caller by default and omitted CloudMonkey's blocking behavior.** Added `listall=true`, documented `asyncblock=false` for immediate job IDs, and clarified that raw API names are supported independently of server profiles.
9. **Completion and reconciliation were too weak.** Required examining the migration response's message and success flag, matching object IDs, and accounting for existing destination copies and snapshot chains. Limited readiness checks to retained resources actually stored on the source, rather than unrelated zone templates.
10. **The NFS diagnostic implied showmount works for every NFS server and that the sample mount pins a version.** Documented the NFSv4-only limitation and explained that the sample negotiates a version unless production options are supplied.

## Review Notes
- Reviewed against the published CloudStack 4.23 API reference and tagged 4.23.0.0 source. The `latest` documentation links may change; operators should check their installed version and CloudMonkey API cache.
- Confirmed the four migration configuration names, the NFS provider and URL form, image-store add/update/delete parameters, system VM filter, snapshot `BackedUp` state, and support for complete and selective migration.
- Confirmed that the installation guide explicitly warns about existing data when adding secondary storage. Kept the empty, dedicated export requirement.
- The supplied official documentation links resolve to the relevant resources. Individual API pages were retrieved directly when the browser fetch returned cache errors.
- Commands were reviewed statically and Bash snippets checked for syntax. No live CloudStack environment or NFS server was available; no migration, mount, deployment, or restore was executed. Deployment and snapshot restore checks remain required operational acceptance tests.
- Preserved the post's headings and overall structure; changes address operational correctness rather than style.

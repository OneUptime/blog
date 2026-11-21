#!/usr/bin/env python3
"""Chart 2.7.0, release clusterpedia, namespace clusterpedia-system only."""
import base64
import os
import sys
from pathlib import Path
import yaml

ca = Path(os.environ['CLUSTERPEDIA_API_CA_FILE']).read_bytes()
if not ca.strip():
    raise ValueError('API CA bundle is empty')
documents = list(yaml.safe_load_all(sys.stdin))
expected = {'clusterpedia-apiserver', 'clusterpedia-clustersynchro-manager'}
seen = set()
api_count = 0
for obj in documents:
    if not isinstance(obj, dict):
        continue
    name = obj.get('metadata', {}).get('name')
    if obj.get('kind') == 'Deployment' and name in expected:
        if obj['metadata'].get('namespace') != 'clusterpedia-system':
            raise ValueError('Unexpected deployment namespace')
        if name in seen:
            raise ValueError('Duplicate deployment')
        seen.add(name)
        pod = obj['spec']['template']['spec']
        pod.setdefault('volumes', []).append({
            'name': 'database-ca',
            'configMap': {'name': 'clusterpedia-database-ca'},
        })
        for container in pod['containers'] + (pod.get('initContainers') or []):
            container.setdefault('volumeMounts', []).append({
                'name': 'database-ca', 'mountPath': '/etc/database-ca', 'readOnly': True,
            })
        if name == 'clusterpedia-apiserver':
            pod['volumes'].append({
                'name': 'api-serving-cert',
                'secret': {'secretName': 'clusterpedia-api-tls'},
            })
            container = next(c for c in pod['containers'] if c['name'] == name)
            container['volumeMounts'].append({
                'name': 'api-serving-cert', 'mountPath': '/etc/api-tls', 'readOnly': True,
            })
            container['command'].extend([
                '--tls-cert-file=/etc/api-tls/tls.crt',
                '--tls-private-key-file=/etc/api-tls/tls.key',
            ])
    if obj.get('kind') == 'APIService' and name == 'v1beta1.clusterpedia.io':
        api_count += 1
        if obj['spec']['service'] != {'name': 'clusterpedia-apiserver', 'namespace': 'clusterpedia-system'}:
            raise ValueError('Unexpected APIService target')
        obj['spec']['insecureSkipTLSVerify'] = False
        obj['spec']['caBundle'] = base64.b64encode(ca).decode('ascii')
if seen != expected or api_count != 1:
    raise ValueError('Expected chart objects are missing or duplicated')
yaml.safe_dump_all(documents, sys.stdout, sort_keys=False)

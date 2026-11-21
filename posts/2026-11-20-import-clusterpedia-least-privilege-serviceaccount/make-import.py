import base64
import json
import os
import ssl
from pathlib import Path
from urllib.parse import urlsplit

endpoint = os.environ['MEMBER_API']
url = urlsplit(endpoint)
if url.scheme != 'https' or not url.hostname or url.query or url.fragment or url.username:
    raise ValueError('Expected an HTTPS member API endpoint')
ca = Path('member-ca.crt').read_bytes()
ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT).load_verify_locations(cadata=ca.decode('ascii'))
token = Path('member.token').read_text().strip()
if not token or any(c.isspace() for c in token):
    raise ValueError('Expected one nonempty bearer token')
encode = lambda value: base64.b64encode(value).decode('ascii')
resource = {
    'apiVersion': 'cluster.clusterpedia.io/v1alpha2',
    'kind': 'PediaCluster',
    'metadata': {'name': 'member-a'},
    'spec': {
        'apiserver': endpoint,
        'caData': encode(ca),
        'tokenData': encode(token.encode()),
        'syncResources': [
            {'group': '', 'versions': ['v1'], 'resources': ['pods']},
            {'group': 'apps', 'versions': ['v1'], 'resources': ['deployments']},
        ],
    },
}
fd = os.open('member-a.json', os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as stream:
    json.dump(resource, stream, indent=2)
    stream.write('\n')

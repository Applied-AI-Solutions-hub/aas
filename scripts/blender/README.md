# Blender Beacon Pipeline

Blender is not currently installed in this WSL environment. Use these scripts
from a machine/session with Blender available.

Target export:

```bash
blender --background --python scripts/blender/create-beacon-rig.py
```

Expected output:

```text
public/models/beacon-rig.glb
```

The website already loads that GLB path. Until the file exists, it shows a
procedural Three.js stand-in.

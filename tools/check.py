# Checks the skill against the Agent Skills spec and the Claude plugin manifests, without any CLI,
# so CI needs nothing installed. Run: python3 tools/check.py
import json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
errors = []
skill = (root / 'skills/murmuration/SKILL.md').read_text()
fm = skill.split('---')[1]
name = re.search(r'^name: (.+)$', fm, re.M)
desc = re.search(r'^description: (.+)$', fm, re.M)
if not name or name.group(1).strip() != 'murmuration': errors.append('SKILL.md name must be murmuration')
if not desc: errors.append('SKILL.md has no description')
elif len(desc.group(1)) > 1024: errors.append(f'description is {len(desc.group(1))} chars (max 1024)')
elif ': ' in desc.group(1): errors.append('description has an unquoted ": " (invalid YAML)')
# The Agent Skills spec (agentskills.io), which every agent that reads SKILL.md follows.
if name and not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', name.group(1).strip()) or name and len(name.group(1).strip()) > 64:
    errors.append('name must be 1-64 lowercase letters, digits and single hyphens')
compat = re.search(r'^compatibility: (.+)$', fm, re.M)
if compat and len(compat.group(1)) > 500: errors.append(f'compatibility is {len(compat.group(1))} chars (max 500)')
if compat and ': ' in compat.group(1): errors.append('compatibility has an unquoted ": " (invalid YAML)')
for ref in sorted(set(re.findall(r'`((?:references|templates|scripts)/[\w.-]+)`', skill))):
    if not (root / 'skills/murmuration' / ref).exists(): errors.append(f'SKILL.md names a missing file: {ref}')
plugin = json.loads((root / '.claude-plugin/plugin.json').read_text())
market = json.loads((root / '.claude-plugin/marketplace.json').read_text())
if plugin.get('name') != market['plugins'][0].get('name'): errors.append('plugin.json and marketplace.json names differ')
if re.search(r'example-\w+', (root / 'demo/scene.js').read_text()): errors.append('demo/scene.js ships an example-* placeholder')
print('\n'.join(errors) or 'ok: skill and manifests')
sys.exit(1 if errors else 0)

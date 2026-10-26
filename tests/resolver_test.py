import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('refresh',Path(__file__).resolve().parents[1]/'scripts/refresh_catalog.py')
refresh=importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)

class ResolverTests(unittest.TestCase):
    def test_conflicting_architecture_is_withheld(self):
        for url in ['https://example.com/a-x64.exe','https://example.com/x86_64/a.zip','https://example.com/a_amd64.msi']:
            self.assertTrue(refresh.conflicting_architecture(url))
        self.assertFalse(refresh.conflicting_architecture('https://example.com/a-arm64ec.exe'))
        self.assertFalse(refresh.conflicting_architecture('https://example.com/a-arm64.exe'))

    def test_version_sort_is_numeric(self):
        self.assertEqual(sorted(['2.9','2.10','2.2'],key=refresh.version_key),['2.2','2.9','2.10'])

    def test_github_release_accepts_windows_arm_artifacts_only(self):
        source=['test','Test','Tools','Vendor.Test','https://example.com/','test','#123456',False]
        import json
        release={'tag_name':'v2.0','html_url':'https://github.com/vendor/app/releases/tag/v2.0','assets':[
          {'name':name,'browser_download_url':'https://github.com/vendor/app/releases/download/v2.0/'+name,'digest':'sha256:'+'a'*64}
          for name in ['app-arm64.exe','app-aarch64.msi','app-x64.exe','app-linux-arm64.zip','app-macos-aarch64.zip','app-arm64.apk','app-arm64-debug.zip']]}
        with patch.object(refresh,'get',return_value=json.dumps(release)):
            record=refresh.github_release(source,'vendor/app')
        self.assertEqual(len(record['downloads']),2)
        self.assertEqual(record['version'],'2.0')
        self.assertEqual(record['downloads'][0]['sha256'],'a'*64)

if __name__=='__main__':unittest.main()

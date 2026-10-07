"""Make fonts/kai.woff2: AR PL KaitiM GB (Arphic Public License, fonts/LICENSE-ArphicPL.txt), a textbook-style Kai
script, cut down to the characters the page shows in it: the name 数学乐园, the number words with their pinyin
(一 yī …), the position words (上面 下面 左边 右边 前面 后面) and the shape names (长方体 正方体 圆柱 球).
Everything else uses the device's own Chinese font.

fonts/andika-*.woff2 (pinyin) and fonts/fredoka-latin.woff2 come from Google Fonts (SIL Open Font License).

Usage:
  pip install fonttools brotli
  # gkai00mp.ttf is in the Debian / Ubuntu package fonts-arphic-gkai00mp
  python3 tools/build_fonts.py /usr/share/fonts/truetype/arphic-gkai00mp/gkai00mp.ttf
"""
import os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KAI_TEXT = '数学乐园' + '零一二三四五六七八九十' + '上下左右前后面边' + '长方体正圆柱球' + '，。！？、：；“”（）…·'


def kai(src):
    with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write(KAI_TEXT)
    out = os.path.join(ROOT, 'fonts', 'kai.woff2')
    subprocess.run([sys.executable, '-m', 'fontTools.subset', src, f'--text-file={f.name}', '--flavor=woff2',
                    f'--output-file={out}', '--no-hinting', '--desubroutinize', '--layout-features=*',
                    '--name-IDs=*', '--name-languages=*'], check=True, capture_output=True)
    os.unlink(f.name)
    print(f'kai.woff2: {len(set(KAI_TEXT))} characters, {os.path.getsize(out) // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    kai(sys.argv[1])

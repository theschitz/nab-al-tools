#!/usr/bin/env python3
# TODO: Unpack g.xlf
import os
import shutil
import requests
from typing import List, Dict
import zipfile
import re
import xml.etree.ElementTree as ET
import json
from sys import argv


# Update when needed
TMP_DIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), "tmp")
XLF_DIR = os.path.join(TMP_DIR, "Translations")
tooltip_re = re.compile(r"Page \d* - Control \d* - Property 1295455071")


def add_to_dict(dictionary: Dict[str, List[str]], key: str, value: str) -> Dict[str, List[str]]:
    if key in dictionary:
        if not value in dictionary[key]:
            dictionary[key].append(value)
    elif value:
        dictionary[key] = [value]
    return dictionary


def parse(g_xlf_path: str):
    tree = ET.parse(g_xlf_path)
    root = tree.getroot()
    tooltips: Dict[str, List[str]] = {}
    for node in root:
        trans_unit_list = [
            trans_unit for trans_unit in node[0][0] if valid_tag(trans_unit)
        ]
    tooltip_units = [
        trans_unit for trans_unit in trans_unit_list
        if tooltip_re.match(trans_unit.attrib['id'])
    ]
    print("No of tooltip transunits:", len(tooltip_units))
    exit()  # TODO: Test!
    for trans_unit in trans_unit_list:
        unit_id = trans_unit.attrib['id']
        source = trans_unit[0].text

        if tooltip_re.match(unit_id) is not None:
            tooltips = add_to_dict(tooltips, unit_id, source)
    out_path = os.path.join(XLF_DIR, "base-app-tooltips.json")
    with open(out_path, "w", encoding="utf8") as f:
        f.write(json.dumps(tooltips, ensure_ascii=False))


def valid_tag(tag) -> bool:
    if not tag:
        return False
    source = tag[0]
    if not "source" in source.tag:
        return False
    if not source.text:
        return False
    return True


def create_temp_folders(tmp_dir: str, xlf_dir: str):
    if not os.path.exists(tmp_dir):
        os.mkdir(tmp_dir)
    if not os.path.exists(xlf_dir):
        os.mkdir(xlf_dir)


def usage() -> str:
    return """
    extract-tooltip.py <path-to-g.xlf>
    """


if __name__ == "__main__":
    create_temp_folders(TMP_DIR, XLF_DIR)
    if len(argv) < 2:
        print(usage)
        exit()
    parse(argv[1])

import os
import shutil
import subprocess
import runpy
import webbrowser

PROD_DIR = os.path.dirname(os.path.realpath(__file__))
KD_TREE_DIR = os.path.join(PROD_DIR, "kd_tree")
JS_DIR = os.path.join(PROD_DIR, "custom_modules")
MODEL_NAME = "model.pcd"
MODEL_PATH = os.path.join(PROD_DIR, MODEL_NAME)

shutil.copyfile(MODEL_PATH, os.path.join(KD_TREE_DIR, MODEL_NAME))

os.chdir(KD_TREE_DIR)
subprocess.run(["make"])

shutil.copyfile(
    os.path.join(KD_TREE_DIR, "kd_tree.js"),
    os.path.join(PROD_DIR, "kd_tree.js"))
shutil.copyfile(
    os.path.join(KD_TREE_DIR, "kd_tree.wasm"),
    os.path.join(PROD_DIR, "kd_tree.wasm"))
shutil.copyfile(
    os.path.join(KD_TREE_DIR, "kd_tree.data"),
    os.path.join(PROD_DIR, "kd_tree.data"))


os.chdir(PROD_DIR)
subprocess.run(["extrusion/bin/planar_segmentation", "model.pcd", "model.json"])

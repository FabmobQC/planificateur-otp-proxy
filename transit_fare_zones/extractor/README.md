# Transit fare zones extractor
This is a script to extract the geodata for the fare zones of the agencies we support.

# Steps
1. Download the SHP file
The SHP file can be found here: https://www.donneesquebec.ca/recherche/dataset/decoupages-administratifs.  
It is suggested to use the 1/100000 resolution, as it appears to be sufficient for our needs.  
Note you can also download a documentation for the structure of the data (Structure physique des données).  
3. Install the dependencies
``` sh
pip3 install -r requirements.txt
```
If you intend to modify the code, it is suggested to also install `requiements_dev.txt`, and then use `black` and `mypy` in order to maintain clean code.
4. Make sure variables are set properly
Two variables have to be set into `extrator.py`:
- shp_path: The path to *munic_s.shp*, which you have downloaded in step 1.
- destination_path: The path to the folder where you want the geojson to be saved.
5. Run the script
``` sh
python3 extractor.py
```

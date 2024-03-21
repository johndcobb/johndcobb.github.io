import folium
from geopy.geocoders import Nominatim
import yaml 

## All credit for this code goes to Austin Hunt.
## Make sure to change the python interpreter in VS code with CNTRL shift P to manim to make it work.

def create_map(locations):
    """ Create a map centered at the first location """ 
    map_center = [16.383, -5.74]
    my_map = folium.Map(location=map_center, world_copy_jump=True, zoom_start=1, tiles = "cartodb positron", zoom_control = False)

    # Add markers for each location
    for loc in locations:
        folium.Marker(location=[loc['lat'], loc['lon']], popup=loc['name']).add_to(my_map)
        #icon=folium.Icon(color="gray", icon = 'circle', prefix = 'fa')

    return my_map

def get_lat_lon(city, state): 
    """ 
    Use a geocoding service to get the lat, lon for the city, state
    """
    try:
        address = f"{city}, {state}"
        geolocator = Nominatim(user_agent="OpenStreetMap Parser", timeout=5)
        location = geolocator.geocode(address)
        return {
            'lat': location.latitude,
            'lon': location.longitude 
        }
    except Exception as e:
        print(f"Error: {e}")
        return None
     

def get_locations_from_yaml_file():
    try:
        data = yaml.safe_load(open("_data/travel.yml"))
        where_values = [item['where'] for item in data]
        return list(set(where_values))
    except Exception as error:
        print(f"Error: {error}")
        return None



def parse_location(location_str):
    """ 
    Parse a location string into a dictionary with keys: name, state, lat, lon

    Example:
    Input: "{London, UK}"
    Output: {'name': 'London', 'state': 'UK', 'lat': 51.5073219, 'lon': -0.1276474}
    """
    # Assuming the location_str is in the format {city, state}
    print(location_str)
    city_state = location_str.strip('{}').split(',')
    city = city_state[0].strip()
    state = city_state[1].strip()
    print(f"City: {city}, State: {state}")
    # Use a geocoding service to get the lat, lon for the city, state
    lat_lon = get_lat_lon(city, state)
    return {'name': city, 'state': state, 'lat': lat_lon['lat'], 'lon': lat_lon['lon']} 

if __name__ == "__main__":
    # Example list of locations
    input_locations = get_locations_from_yaml_file()  # Add more locations as needed

    # Parse locations
    parsed_locations = []
    for location_str in input_locations:
        parsed_locations.append(parse_location(location_str))

    # Create map
    my_map = create_map(parsed_locations)

    # Save map to an HTML file
    my_map.save("assets/travelmap.html")
    print('Map created and saved to assets/travelmap.html')
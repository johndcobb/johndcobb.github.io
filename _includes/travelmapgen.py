import folium
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderRateLimited, GeocoderServiceError
from geopy.extra.rate_limiter import RateLimiter
import yaml 
import time
from pathlib import Path

## All credit for this code goes to Austin Hunt.
## Make sure to change the python interpreter in VS code with CNTRL shift P to manim to make it work.

GEOCODER = Nominatim(user_agent="johndcobb-travelmap/1.0", timeout=5)
GEOCODE = RateLimiter(
    GEOCODER.geocode,
    min_delay_seconds=2.0,
    max_retries=0,
    swallow_exceptions=False,
)
CACHE_PATH = Path("_data/travel_geocode_cache.yml")
MAX_GEOCODE_ATTEMPTS = 5
BASE_RETRY_DELAY_SECONDS = 5.0


def normalize_address(city, state):
    return f"{city.strip()}, {state.strip()}"


def cache_key_for_address(address):
    return address.lower()


def load_geocode_cache():
    if not CACHE_PATH.exists():
        return {}

    data = yaml.safe_load(CACHE_PATH.read_text())
    if isinstance(data, dict):
        normalized_cache = {}
        for address, lat_lon in data.items():
            if not isinstance(address, str) or not isinstance(lat_lon, dict):
                continue
            if "lat" not in lat_lon or "lon" not in lat_lon:
                continue
            normalized_cache[cache_key_for_address(address)] = lat_lon
        return normalized_cache
    return {}


def save_geocode_cache(cache):
    CACHE_PATH.write_text(yaml.safe_dump(cache, sort_keys=True))

def create_map(locations):
    """ Create a map centered at the first location """ 
    map_center = [16.383, -5.74]
    my_map = folium.Map(location=map_center, world_copy_jump=True, zoom_start=1, tiles = "cartodb positron", zoom_control = False)

    # Add markers for each location
    for loc in locations:
        folium.Marker(location=[loc['lat'], loc['lon']], popup=loc['name']).add_to(my_map)
        #icon=folium.Icon(color="gray", icon = 'circle', prefix = 'fa')

    return my_map

def get_lat_lon(city, state, cache): 
    """ 
    Use a geocoding service to get the lat, lon for the city, state
    """
    address = normalize_address(city, state)
    key = cache_key_for_address(address)

    if key in cache:
        return cache[key]

    for attempt in range(1, MAX_GEOCODE_ATTEMPTS + 1):
        try:
            location = GEOCODE(address)
            if location is None:
                raise ValueError(f"No geocoding result for '{address}'")

            lat_lon = {
                'lat': location.latitude,
                'lon': location.longitude 
            }
            cache[key] = lat_lon
            save_geocode_cache(cache)
            return lat_lon
        except GeocoderRateLimited as error:
            retry_after = getattr(error, "retry_after", None)
            wait_seconds = float(retry_after) if retry_after else BASE_RETRY_DELAY_SECONDS * attempt
            if attempt == MAX_GEOCODE_ATTEMPTS:
                raise RuntimeError(f"Geocoding rate-limited for '{address}' after {MAX_GEOCODE_ATTEMPTS} attempts") from error
            print(f"Rate limited while geocoding '{address}'. Retrying in {wait_seconds:.1f}s ({attempt}/{MAX_GEOCODE_ATTEMPTS})")
            time.sleep(wait_seconds)
        except GeocoderServiceError as error:
            wait_seconds = BASE_RETRY_DELAY_SECONDS * attempt
            if attempt == MAX_GEOCODE_ATTEMPTS:
                raise RuntimeError(f"Geocoding service failed for '{address}' after {MAX_GEOCODE_ATTEMPTS} attempts") from error
            print(f"Geocoding service error for '{address}'. Retrying in {wait_seconds:.1f}s ({attempt}/{MAX_GEOCODE_ATTEMPTS})")
            time.sleep(wait_seconds)
     

def get_locations_from_yaml_file():
    try:
        data = yaml.safe_load(open("_data/travel.yml"))
        where_values = [item['where'] for item in data]
        return sorted(set(where_values))
    except Exception as error:
        print(f"Error: {error}")
        return None



def parse_location(location_str, cache):
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
    lat_lon = get_lat_lon(city, state, cache)
    return {'name': city, 'state': state, 'lat': lat_lon['lat'], 'lon': lat_lon['lon']} 

if __name__ == "__main__":
    # Example list of locations
    input_locations = get_locations_from_yaml_file()  # Add more locations as needed
    geocode_cache = load_geocode_cache()

    # Parse locations
    parsed_locations = []
    for location_str in input_locations:
        try:
            parsed_locations.append(parse_location(location_str, geocode_cache))
        except Exception as error:
            print(f"Skipping '{location_str}': {error}")

    # Create map
    my_map = create_map(parsed_locations)

    # Save map to an HTML file
    my_map.save("assets/travelmap.html")
    print('Map created and saved to assets/travelmap.html')
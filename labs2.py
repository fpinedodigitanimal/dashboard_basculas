import requests
import logging
import pandas as pd
from functools import lru_cache
from typing import Optional, Dict, Any
import sys

# Configurar el logger
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL = 'https://digitanimal-labs.com/digitanimal-scale/api/v4/'
SESSION = requests.Session()

# Variable para seleccionar la base de datos a usar en las llamadas a la API.
CURRENT_DATABASE = 'scale'  # Valor por defecto; se puede cambiar a 'horsedata'

def set_database(db_name: str) -> None:
    """
    Permite cambiar la base de datos que se utilizará en las llamadas a la API.
    
    Ejemplo de uso:
        set_database('horsedata')
    """
    global CURRENT_DATABASE
    CURRENT_DATABASE = db_name
    logger.info(f"Base de datos establecida en: {CURRENT_DATABASE}")

@lru_cache(maxsize=1)
def get_token() -> Optional[str]:
    """
    Obtiene y cachea el token de autenticación para la API.

    Ejemplo de uso:
        token = labs.get_token()

    Returns:
        str: El token de autenticación si la solicitud fue exitosa, o None en caso de error.
    """
    login_url = f'{BASE_URL}login'
    credentials = {
        "user": "ROOT",
        "password": "rootScale2023"
    }
    
    try:
        response = SESSION.post(login_url, json=credentials, timeout=10)
        response.raise_for_status()
        return response.json().get('token')
    except requests.exceptions.RequestException as e:
        logger.error(f"Error al obtener el token: {e}")
        return None

def api_get(endpoint: str, params: Optional[Dict[str, Any]] = None, timeout: int = 10) -> Dict[str, Any]:
    """
    Realiza una solicitud GET a la API y devuelve la respuesta JSON con reintentos en caso de error.

    Ejemplo de uso:
        response = labs.api_get('log_weight', params={'column': 'scale_id', 'equal': 'B00047'})

    Args:
        endpoint (str): El endpoint de la API al que realizar la solicitud.
        params (dict, optional): Parámetros adicionales para la solicitud GET.
        timeout (int, optional): El tiempo máximo de espera para la solicitud. Default es 10 segundos.

    Returns:
        dict: La respuesta de la solicitud GET.
    """
    token = get_token()
    if not token:
        return {"error": "No se pudo obtener un token válido."}
    
    headers = {'Authorization': token}
    url = f'{BASE_URL}{CURRENT_DATABASE}/{endpoint}'
    try:
        logger.debug(f"Realizando solicitud GET a: {url} con parámetros: {params}")
        response = SESSION.get(url, headers=headers, params=params, timeout=timeout)
        response.raise_for_status()

        # Comprobar si la respuesta está vacía
        if not response.text.strip():
            logger.error("La respuesta está vacía.")
            return {"error": "La respuesta está vacía."}

        try:
            return response.json()
        except ValueError:
            logger.error("La respuesta no es un JSON válido.")
            logger.error(f"Contenido de la respuesta (primeros 500 caracteres): {response.text[:500]}")
            logger.error(f"Status Code: {response.status_code}")
            return {"error": "La respuesta no es un JSON válido.", "raw_response": response.text[:500]}
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error en la solicitud GET: {e}")
        return {"error": str(e)}

def get_table_data(
    table_name: str,
    column: Optional[str] = None,
    value: Optional[str] = None,
    operator: Optional[str] = None
) -> pd.DataFrame:
    """
    Obtiene los datos de una tabla específica desde la API, con o sin filtros.
    Ahora permite filtrar usando operadores como 'more', 'less', etc.

    Ejemplo de uso:
        tabla = labs2.get_table_data('log_weight', column='created_at', value='2025-06-09', operator='more')

    Args:
        table_name (str): El nombre de la tabla en la API.
        column (str, optional): Nombre de la columna para aplicar el filtro.
        value (str, optional): Valor para filtrar los datos.
        operator (str, optional): Operador para el filtro ('equal', 'more', 'less', etc.).

    Returns:
        pd.DataFrame: Un DataFrame de Pandas con los datos obtenidos de la API.
    """
    params = {}
    if column and value:
        if operator:
            params = {'column': column, operator: value}
        else:
            params = {'column': column, 'equal': value}

    response = api_get(table_name, params)

    if 'error' in response:
        logger.error(f"Error en la respuesta: {response['error']}")
        return pd.DataFrame()
    
    try:
        df = pd.DataFrame(response)
        return df
    except Exception as e:
        logger.error(f"Error al convertir la respuesta a DataFrame: {e}")
        return pd.DataFrame()

def post_data(table_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Envía datos a la API mediante una solicitud POST a la tabla especificada.

    Ejemplo de uso:
        response = labs.post_data('log_weight', {'scale_id': 'B00047', 'epc': '0', 'weight': 0})

    Args:
        table_name (str): El nombre de la tabla en la API.
        data (dict): Los datos a enviar en la solicitud POST.

    Returns:
        dict: La respuesta de la solicitud POST.
    """
    token = get_token()
    if not token:
        return {"error": "No se pudo obtener un token válido."}
    
    headers = {'Authorization': token, 'Content-Type': 'application/json'}
    url = f'{BASE_URL}{CURRENT_DATABASE}/{table_name}'

    if '-d' in sys.argv:
        pass
        # logger.setLevel(logging.DEBUG)
        # logger.debug(f"Datos enviados - tabla: {table_name}, datos: {data}")
    
    try:
        response = SESSION.post(url, headers=headers, json=data, timeout=10)
        response.raise_for_status()

        if not response.text.strip():
            logger.error("La respuesta está vacía.")
            return {"error": "La respuesta está vacía."}

        try:
            return response.json()
        except ValueError:
            logger.error("La respuesta no es un JSON válido.")
            return {"error": "La respuesta no es un JSON válido."}
    except requests.exceptions.RequestException as e:
        logger.error(f"Error en la solicitud POST: {e}")
        return {"error": str(e)}
    
def patch_by_id(table: str, id: int, data: Dict[str, Any]):
    """
    Realiza una solicitud PATCH a la API para actualizar el registro con el ID especificado en la tabla indicada.
    
    Ejemplo para "log_weight", id=950258, data={"weight": 10}:
        patch_by_id('log_weight', 950258, {"weight": 10})

    Args:
        table (str): El nombre de la tabla a actualizar.
        id (int): El ID del registro a actualizar.
        data (dict): Los datos a enviar en la solicitud PATCH.
    
    Returns:
        Response: La respuesta de la solicitud PATCH.
    """
    url = f'{BASE_URL}{CURRENT_DATABASE}/{table}?id={id}'
    
    token = get_token()
    if not token:
        return {"error": "No se pudo obtener un token válido."}
    
    headers = {'Authorization': token, 'Content-Type': 'application/json'}

    try:
        response = SESSION.patch(url, headers=headers, json=data, timeout=10)
        if response.status_code == 200:
            logger.info("Actualización exitosa: " + str(response.json()))
        else:
            logger.error(f"Error en la actualización (status code {response.status_code}): {response.text}")
        return response
    except requests.RequestException as e:
        logger.error("Error al realizar la solicitud PATCH: " + str(e))
        return None

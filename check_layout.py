from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Set up Chrome options
chrome_options = Options()
chrome_options.add_argument('--headless=new')  # Run in headless mode
chrome_options.add_argument('--window-size=1920,1080')  # Standard browser window size
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--no-sandbox')

# Initialize the driver
driver = webdriver.Chrome(options=chrome_options)

try:
    # Navigate to the Streamlit app
    driver.get('http://localhost:8503')

    # Wait for the page to load - wait for the plot to appear
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "canvas")))

    # Give it extra time to fully render
    time.sleep(3)

    # Get page dimensions
    viewport_height = driver.execute_script("return window.innerHeight")
    page_height = driver.execute_script("return document.body.scrollHeight")

    print(f"Viewport height: {viewport_height}px")
    print(f"Page height: {page_height}px")
    print(f"Scrolling needed: {page_height > viewport_height}")

    if page_height > viewport_height:
        print(f"Amount of scrolling needed: {page_height - viewport_height}px")

    # Take a screenshot
    screenshot_path = r"C:\Users\marku\Dropbox (Personal)\Teaching\Apps\screenshot.png"
    driver.save_screenshot(screenshot_path)
    print(f"\nScreenshot saved to: {screenshot_path}")

    # Get the position of the main plot
    try:
        # Find all canvas elements (matplotlib plots are rendered as canvas)
        canvases = driver.find_elements(By.TAG_NAME, "canvas")
        if canvases:
            plot_canvas = canvases[0]  # Assume first canvas is our plot
            plot_location = plot_canvas.location
            plot_size = plot_canvas.size
            print(f"\nPlot location: y={plot_location['y']}px")
            print(f"Plot size: {plot_size['width']}x{plot_size['height']}px")
            print(f"Plot bottom edge: {plot_location['y'] + plot_size['height']}px")

            if plot_location['y'] + plot_size['height'] > viewport_height:
                print(f"WARNING: Plot bottom is below the fold by {plot_location['y'] + plot_size['height'] - viewport_height}px")
            else:
                print("SUCCESS: Entire plot is visible without scrolling!")
    except Exception as e:
        print(f"Could not locate plot: {e}")

finally:
    driver.quit()

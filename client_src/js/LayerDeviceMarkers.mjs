"use strict";

import L from 'leaflet';
import 'leaflet.markercluster';
// import CreateElement from 'dom-create-element-query-selector';
// We're using the git repo for now until an update is released, and rollup doesn't like that apparently
import CreateElement from '../../node_modules/dom-create-element-query-selector/src/index.js';

import Config from './Config.mjs';
import GetFromUrl from './Helpers/GetFromUrl.mjs';

class LayerDeviceMarkers {
	constructor(in_map) {
		this.map = in_map;
		
		// Create a new clustering layer
		this.layer = L.markerClusterGroup();
	}
	
	async setup() {
		
		// Fetch the device list
		let device_list = JSON.parse(await GetFromUrl(
			`${Config.api_root}?action=list-devices&only-with-location=yes`
		));
		
		// Add a marker for each device
		for (let device of device_list) {
			this.add_device_marker(device);
		}
		
		// Display this layer
		this.map.addLayer(this.layer);
	}
	
	add_device_marker(device) {
		// Create the marker
		let marker = L.marker(
			L.latLng(device.latitude, device.longitude),
			{ // See https://leafletjs.com/reference-1.4.0.html#marker
				title: `Device: ${device.name}`,
				autoPan: true,
				autoPanPadding: L.point(100, 100)
			}
		);
		// Create the popup
		let popup = L.popup({
			className: "popup-device",
			autoPanPadding: L.point(100, 100)
		}).setContent("&#x231b; Loading..."); // TODO: Display a nice loading animation here
		marker.on("popupopen", this.marker_popup_open_handler.bind(this, device.id));
		
		marker.bindPopup(popup);
		
		this.layer.addLayer(marker);
	}
	
	async marker_popup_open_handler(device_id, event) {
		if(typeof device_id !== "number")
			throw new Exception("Error: Invalid device id passed.");
		
		let device_info = JSON.parse(await GetFromUrl(`${Config.api_root}?action=device-info&device-id=${device_id}`));
		
		device_info.location = [ device_info.latitude, device_info.longitude ];
		delete device_info.latitude;
		delete device_info.longitude;
		
		event.popup.setContent(this.render_device_info(device_info));
	}
	
	render_device_info(device_info) {
		let result = document.createDocumentFragment();
		
		result.appendChild(CreateElement("h2.device-name",
			`Device: ${device_info.name}`
		));
		result.querySelector(".device-name").dataset.id = device_info.id;
		
		let info_list = [];
		for(let property in device_info) {
			// Filter out properties we're handling specially
			if(["id", "other"].includes(property)) continue;
			
			// Ensure the property is a string - giving special handling to 
			// some property values
			let value = device_info[property];
			if(typeof value != "string") {
				switch(property) {
					case "location":
						value = `(${value[0]}, ${value[1]})`;
						break;
					default:
						value = value.toString();
						break;
				}
			}
			
			info_list.push(CreateElement(
				"tr.device-property",
				CreateElement("th.name", property.split("_").map((word) => word[0].toUpperCase()+word.slice(1)).join(" ")),
				CreateElement("td.value", value)
			));
		}
		result.appendChild(CreateElement("table.device-property-list", ...info_list));
		
		result.appendChild(CreateElement("p.device-notes",
			CreateElement("em", device_info.other)
		));
		
		return result;
	}
}

export default LayerDeviceMarkers;

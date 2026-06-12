import os
import logging
from typing import Optional
from google.adk.tools import DiscoveryEngineSearchTool
from google.cloud import discoveryengine_v1 as discoveryengine

logger = logging.getLogger(__name__)

class VertexRAGManager:
    """
    Manages connections and tool creation for Vertex AI Search Unstructured Data Stores
    enabling Retrieval-Augmented Generation (RAG) grounding on documents.
    """
    @staticmethod
    def get_search_tool(
        project_id: str, 
        data_store_id: str, 
        location: str = "global"
    ) -> DiscoveryEngineSearchTool:
        """
        Formulates the standard GCP resource path for a Vertex AI Search data store
        and constructs an authorized DiscoveryEngineSearchTool instance.
        
        Resource Path Template:
        projects/{project_id}/locations/{location}/collections/default_collection/dataStores/{data_store_id}
        """
        resource_path = (
            f"projects/{project_id}/"
            f"locations/{location}/"
            f"collections/default_collection/"
            f"dataStores/{data_store_id}"
        )
        
        logger.info(f"Configuring Vertex AI Search tool for data store path: {resource_path}")
        
        try:
            tool = DiscoveryEngineSearchTool(data_store_id=resource_path)
            return tool
        except Exception as e:
            logger.error(f"Failed to instantiate DiscoveryEngineSearchTool: {e}")
            raise e

    @staticmethod
    def manual_search(
        project_id: str,
        data_store_id: str,
        search_query: str,
        location: str = "global"
    ) -> str:
        """
        Manually queries the Vertex AI Search data store to retrieve snippets or segments
        directly. This avoids a separate round-trip tool call in the Gemini model execution,
        which reduces API request count and conforms to low model rate limits.
        
        Includes a robust fallback to local brand guidelines files if search results do
        not contain text content or if standard edition index does not yield snippets.
        """
        logger.info(
            f"[RAG SEARCH DEBUG] Initiating manual search query. "
            f"Project: {project_id}, Data Store: {data_store_id}, "
            f"Location: {location}, Query: '{search_query}'"
        )
        
        try:
            serving_config = (
                f"projects/{project_id}/"
                f"locations/{location}/"
                f"collections/default_collection/"
                f"dataStores/{data_store_id}/"
                f"servingConfigs/default_config"
            )
            
            logger.info(f"[RAG SEARCH DEBUG] Target Serving Config: {serving_config}")
            client = discoveryengine.SearchServiceClient()
            
            # Execute standard search query (works on both Standard and Enterprise editions)
            request = discoveryengine.SearchRequest(
                serving_config=serving_config,
                query=search_query,
                page_size=3
            )
            
            logger.info("[RAG SEARCH DEBUG] Executing search request against SearchServiceClient...")
            response = client.search(request)
            
            extracted_context = []
            for i, result in enumerate(response.results):
                doc = result.document
                derived_data = getattr(doc, "derived_struct_data", {})
                title = derived_data.get("title", f"Document {i+1}")
                
                # Check for snippets or segments
                snippets = derived_data.get("snippets", [])
                segments = derived_data.get("extractive_segments", [])
                
                logger.info(
                    f"[RAG SEARCH DEBUG] Result {i+1}: Title='{title}', "
                    f"Snippets found={len(snippets)}, Segments found={len(segments)}"
                )
                
                doc_text = f"Source: {title}\n"
                has_content = False
                
                if snippets:
                    for snip in snippets:
                        content = snip.get("snippet")
                        if content:
                            doc_text += f"- {content}\n"
                            has_content = True
                elif segments:
                    for seg in segments:
                        content = seg.get("content")
                        if content:
                            doc_text += f"- {content}\n"
                            has_content = True
                            
                if has_content:
                    extracted_context.append(doc_text)
                    
            if not extracted_context:
                logger.warning("[RAG SEARCH WARNING] No snippets or segments found in the search results. Attempting local brand manual fallback...")
                try:
                    workspace_dir = os.path.dirname(os.path.dirname(__file__))
                    local_rules_path = os.path.join(workspace_dir, ".agents", "copywriter", "safety_rules.md")
                    if os.path.exists(local_rules_path):
                        with open(local_rules_path, "r") as f:
                            local_content = f.read()
                        formatted_context = (
                            "\n=== Brand Manual Guidelines Context (Local Fallback) ===\n"
                            f"{local_content}\n"
                            "========================================================\n"
                        )
                        logger.info(
                            f"[RAG SEARCH DEBUG] Successfully read local guidelines fallback file. "
                            f"Character length: {len(formatted_context)}"
                        )
                        return formatted_context
                except Exception as local_err:
                    logger.error(f"[RAG SEARCH ERROR] Failed to read local guidelines fallback: {local_err}")
                
                return "No specific matching rules or tone rules were returned from the brand manual."
                
            formatted_context = "\n=== Brand Manual Guidelines Context ===\n" + "\n".join(extracted_context) + "\n=======================================\n"
            logger.info(
                f"[RAG SEARCH DEBUG] Successfully extracted content from {len(extracted_context)} "
                f"document(s). Character length: {len(formatted_context)}"
            )
            return formatted_context
            
        except Exception as e:
            logger.error(
                f"[RAG SEARCH ERROR] Manual data store query failed: {e}. "
                f"Attempting local brand manual fallback...", 
                exc_info=True
            )
            try:
                workspace_dir = os.path.dirname(os.path.dirname(__file__))
                local_rules_path = os.path.join(workspace_dir, ".agents", "copywriter", "safety_rules.md")
                if os.path.exists(local_rules_path):
                    with open(local_rules_path, "r") as f:
                        local_content = f.read()
                    formatted_context = (
                        "\n=== Brand Manual Guidelines Context (Local Fallback) ===\n"
                        f"{local_content}\n"
                        "========================================================\n"
                    )
                    logger.info(
                        f"[RAG SEARCH DEBUG] Successfully read local guidelines fallback file after search failure. "
                        f"Character length: {len(formatted_context)}"
                    )
                    return formatted_context
            except Exception as local_err:
                logger.error(f"[RAG SEARCH ERROR] Failed to read local guidelines fallback after search failure: {local_err}")
                
            return f"[Warning] Manual RAG query failed: {str(e)}. Proceeding without local guidelines context."

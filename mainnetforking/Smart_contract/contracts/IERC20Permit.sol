// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IERC20.sol";

// Define the IERC20Permit interface that extends the standard ERC20 interface
interface IERC20Permit is IERC20 {
    // Permit function (allows approvals via signed messages)
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    // Nonces function (returns the current nonce of the owner)
    function nonces(address owner) external view returns (uint256);

    // Optional function that may exist in ERC20Permit implementations
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

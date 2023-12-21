#!/usr/bin/env bash
set -eu

# ENVIRONMENT VARIABLES
CONTRACTS_DIR="${CONTRACTS_DIR:=./src}" # Base contract directory 
FILES="${FILES:=./deployments/files}" # Output directory for build files
ADDRESSES="${ADDRESSES:=./deployments/addresses}" # Output directory for contract addresses

# Copy command helper (cross-platform)
CP_CMD=$(command -v cp &> /dev/null && echo "cp" || echo "copy")

# Determine all contracts under `$CONTRACTS_DIR`
contracts=($(find $CONTRACTS_DIR -maxdepth 1 -type d -exec test -f {}/Cargo.toml \; -print | xargs -n 1 basename))

# Build all contracts
for i in "${contracts[@]}"
do
  echo -e "\nBuilding '$CONTRACTS_DIR/$i/Cargo.toml'…"
  cargo contract build --release --quiet --manifest-path $CONTRACTS_DIR/$i/Cargo.toml

  echo "Creating folder for contract addresses at '$ADDRESSES/$i/'…"
  mkdir -p $ADDRESSES/$i
  
  echo "Copying build files to '$FILES/$i/'…"
  mkdir -p $FILES/$i
  $CP_CMD ./target/ink/$i/$i.contract $FILES/$i/
  $CP_CMD ./target/ink/$i/$i.wasm $FILES/$i/
  $CP_CMD ./target/ink/$i/$i.json $FILES/$i/
done